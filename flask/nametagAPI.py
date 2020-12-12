import flask
from flask import request, jsonify
from sqlalchemy import *
from dbEngine import db
import json
import datetime
import urllib
import yaml
from remoteGoogImage import detect_text_uri
app = flask.Flask(__name__)
app.config["DEBUG"] = True

with open(r'jiselConf.yaml') as file:
    # The FullLoader parameter handles the conversion from YAML
    # scalar values to Python the dictionary format
    jiselConf = yaml.load(file, Loader=yaml.FullLoader)

    print(jiselConf)

def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d


@app.route('/', methods=['GET'])
def home():
    return '''<h1>Distant Reading Archive</h1>
<p>A prototype API for distant reading of science fiction novels.</p>'''


@app.route('/api/v1/playerStats/questions', methods=['GET'])
def api_all():
    metadata = MetaData(schema="pwm")
    try:
        with db.connect() as conn:
            questions = []
            questions_table = Table('playerStatsQuestions', metadata, autoload=True, autoload_with=conn)
            select_st = select([questions_table])
            res = conn.execute(select_st)
            for row in res:
                questions.append({
                    "id": row[0],
                    "question_label": row[1],
                    "question_embed": row[2],
                    "last_updated": row[3]
                })
            return jsonify(questions)
    except Exception as err:
        print(err)
        if conn:
            conn.close()
        db.dispose()

def get_discord_character_mapping(discord_id, character_id):
    metadata = MetaData(schema="pwm")
    try:
        with db.connect() as conn:
            discord_character_table = Table('discordToCharacterID', metadata, autoload=True, autoload_with=conn)
            if discord_id:
                select_st = select([discord_character_table]).where(discord_character_table.c.discord_id == discord_id)
            else:
                select_st = select([discord_character_table]).where(
                    discord_character_table.c.character_id == character_id)
            res = conn.execute(select_st)
            gathered_discord_char = [{column: str(value) if isinstance(value, int) else value for column, value in rowproxy.items()} for rowproxy in res][0]
            return gathered_discord_char
    except Exception as err:
        print(err)
        if conn:
            conn.close()
        db.dispose()

@app.route('/api/v1/playerStats/discordCharacterMapping', methods=['GET', 'POST', 'PUT'])
def discord_character_mapping():
    # You might want to return some sort of response...
    metadata = MetaData(schema="pwm")
    if request.method == 'GET':
        discord_id = request.args.get('discordID') or None
        character_id = request.args.get('characterID') or None
        if discord_id or character_id:
            if discord_id:
                discord_id = int(discord_id)
            if character_id:
                character_id = int(character_id)
            return jsonify(get_discord_character_mapping(discord_id, character_id))
        else:
            try:
                with db.connect() as conn:
                    discord_character_table = Table('discordToCharacterID', metadata, autoload=True, autoload_with=conn)
                    select_st = select([discord_character_table])
                    res = conn.execute(select_st)
                    gathered_discord_char = [{column: value for column, value in rowproxy.items()} for rowproxy in res]
                    return jsonify(gathered_discord_char)
            except Exception as err:
                print(err)
                if conn:
                    conn.close()
                db.dispose()

    if request.method == 'POST':
        discord_character_dict = request.json
        ingame_name = discord_character_dict['ingame_name'] or None
        resulting_mapping = upsert_to_discord_character_mapping(discord_character_dict['discord_id'], discord_character_dict['character_id'], ingame_name)
        return jsonify(resulting_mapping)

    if request.method == 'PUT':
        discord_character_dict = request.json
        discord_id = discord_character_dict['discord_id'] and int(discord_character_dict['discord_id']) or 0
        character_id = discord_character_dict['character_id'] and int(discord_character_dict['character_id']) or 0
        profile_picture = discord_character_dict['profile_picture']

        if profile_picture:
            resulting_mapping = update_profile_pic(profile_picture, discord_id, character_id)
            return jsonify(resulting_mapping)


def upsert_to_discord_character_mapping(discord_id, character_id, ingame_name=None, profile_picture=None):
    metadata = MetaData(schema="pwm")
    try:
        with db.connect() as conn:
            discord_character_table = Table('discordToCharacterID', metadata, autoload=True, autoload_with=conn)
            update_or_insert_charge_query = f"INSERT INTO pwm.\"discordToCharacterID\" (\"discord_id\", \"character_id\") VALUES ({discord_id or 0}, {character_id or 0} ) ON CONFLICT (\"discord_id\", \"character_id\") DO UPDATE SET \"discord_id\" = {discord_id or 0}, \"character_id\" = {character_id or 0}"
            if ingame_name:
                update_or_insert_charge_query = f"INSERT INTO pwm.\"discordToCharacterID\" (\"discord_id\", \"character_id\", \"ingame_name\") VALUES ({discord_id or 0}, {character_id or 0}, \'{ingame_name}\') ON CONFLICT (\"discord_id\", \"character_id\") DO UPDATE SET \"discord_id\" = {discord_id or 0}, \"character_id\" = {character_id or 0}, \"ingame_name\" = \'{ingame_name}\'"

            result = conn.execute(update_or_insert_charge_query)
            discord_id = discord_id or 0
            character_id = character_id or 0
            select_st = select([discord_character_table]).where(
                and_(
                    discord_character_table.c.discord_id == discord_id,
                    discord_character_table.c.character_id == character_id
                )
            )
            res = conn.execute(select_st)
            gathered_discord_char = [{column: str(value) if isinstance(value, int) else value for column, value in rowproxy.items()} for rowproxy in res][0]
            return gathered_discord_char
    except Exception as err:
        print(err)
        if conn:
            conn.close()
        db.dispose()

def update_profile_pic(profile_picture, discord_id=None, character_id=None):
    metadata = MetaData(schema="pwm")
    try:
        with db.connect() as conn:
            discord_id = discord_id or 0
            character_id = character_id or 0
            player_character_discord_table = Table('discordToCharacterID', metadata, autoload=True, autoload_with=conn)
            update_query = player_character_discord_table.update()\
                .values(profile_picture=profile_picture).where(and_(player_character_discord_table.c.discord_id == discord_id, player_character_discord_table.c.character_id == character_id))
            result = conn.execute(update_query)
            discord_id = discord_id or 0
            character_id = character_id or 0
            select_st = select([discord_id]).where(
                and_(
                    player_character_discord_table.c.discord_id == discord_id,
                    player_character_discord_table.c.character_id == character_id,
                )
            )
            res = conn.execute(select_st)
            gathered_discord_char = [{column: str(value) if isinstance(value, int) else value for column, value in rowproxy.items()} for rowproxy in res][0]
            return gathered_discord_char
    except Exception as err:
        print(err)
        if conn:
            conn.close()
        db.dispose()


@app.route('/api/v1/playerStats/eidolons', methods=['GET', 'POST', 'PUT'])
def eidolon_stats():
    # You might want to return some sort of response...
    metadata = MetaData(schema="pwm")
    if request.method == 'GET':
        # You might want to return some sort of response...
        query_parameters = request.args

        discord_id = query_parameters.get('discordID')
        character_id = query_parameters.get('characterID')
        eidolon_name = query_parameters.get('eidolonName') and " ".join(query_parameters.get('eidolonName').split("%20"))

        metadata = MetaData(schema="pwm")
        if request.method == 'GET':
            try:

                with db.connect() as conn:
                    player_eidolons_table = Table('eidolonPlayerStats', metadata, autoload=True, autoload_with=conn)
                    and_condition = []
                    if discord_id:
                        and_condition.append(player_eidolons_table.c.discord_id == discord_id)
                    if character_id:
                        and_condition.append(player_eidolons_table.c.character_id == character_id)
                    if eidolon_name:
                        and_condition.append(player_eidolons_table.c.eidolon_name == eidolon_name)
                    select_st = select([player_eidolons_table]).where(
                        and_(
                            player_eidolons_table.c.discord_id == (discord_id if discord_id else player_eidolons_table.c.discord_id),
                            player_eidolons_table.c.character_id == (character_id if character_id else player_eidolons_table.c.character_id),
                            player_eidolons_table.c.eidolon_name == (eidolon_name if eidolon_name else player_eidolons_table.c.eidolon_name)
                        )
                    )
                    res = conn.execute(select_st)
                    eidolons_built = [{column: value for column, value in rowproxy.items()} for rowproxy in res]
                    return jsonify(eidolons_built)
            except Exception as err:
                print(err)
                if conn:
                    conn.close()
                db.dispose()

    if request.method == 'POST':
        eidolon_dict = request.json
        eidolons_built = []
        discord_id = int(eidolon_dict['discord_id'])
        character_id = int(eidolon_dict['character_id'])

        try:
            with db.connect() as conn:
                player_eidolons_table = Table('eidolonPlayerStats', metadata, autoload=True, autoload_with=conn)
                insert_statement = player_eidolons_table.insert().values(discord_id=eidolon_dict['discord_id'], character_id=eidolon_dict['character_id'], eidolon_name=eidolon_dict['eidolon_name'], eidolon_skills=eidolon_dict['eidolon_skills'] or None, eidolon_elixirs = eidolon_dict['eidolon_elixirs'] or None, last_updated=datetime.datetime.now())
                conn.execute(insert_statement)
                select_st = select([player_eidolons_table]).where(
                    and_(
                        player_eidolons_table.c.discord_id == discord_id,
                        player_eidolons_table.c.character_id == character_id
                    )
                )
                res = conn.execute(select_st)
                eidolons_built = [{column: value for column, value in rowproxy.items()} for rowproxy in res]
                return jsonify(eidolons_built)

        except Exception as err:
            print(err)
            if conn:
                conn.close()
            db.dispose()

    if request.method == 'PUT':
        eidolon_dict = request.json
        updated_player_eidolon = update_eidolon_stats(eidolon_dict)
        return jsonify(updated_player_eidolon)

def update_eidolon_stats(eidolon_dict):
    metadata = MetaData(schema="pwm")
    try:
        with db.connect() as conn:
            discord_id = int(eidolon_dict['discord_id'])
            character_id = int(eidolon_dict['character_id'])
            eidolon_name = eidolon_dict['eidolon_name']
            player_eidolons_table = Table('eidolonPlayerStats', metadata, autoload=True, autoload_with=conn)
            update_query = player_eidolons_table.update()\
                .values(discord_id=discord_id or player_eidolons_table.c.discord_id, character_id=character_id or player_eidolons_table.c.character_id, eidolon_name=eidolon_dict['eidolon_name'], eidolon_skills=eidolon_dict['eidolon_skills'] or player_eidolons_table.c.eidolon_skills, eidolon_elixirs=eidolon_dict['eidolon_elixirs'] or player_eidolons_table.c.eidolon_elixirs, last_updated=datetime.datetime.now()).where(and_(player_eidolons_table.c.discord_id == discord_id,player_eidolons_table.c.character_id == character_id, player_eidolons_table.c.eidolon_name == eidolon_name))
            result = conn.execute(update_query)
            discord_id = discord_id or 0
            character_id = character_id or 0
            select_st = select([discord_id]).where(
                and_(
                    player_eidolons_table.c.discord_id == discord_id,
                    player_eidolons_table.c.character_id == character_id,
                    player_eidolons_table.c.eidolon_name == eidolon_name
                )
            )
            res = conn.execute(select_st)
            gathered_discord_char = [{column: str(value) if isinstance(value, int) else value for column, value in rowproxy.items()} for rowproxy in res][0]
            return gathered_discord_char
    except Exception as err:
        print(err)
        if conn:
            conn.close()
        db.dispose()

@app.route('/api/v1/playerStats/eidolon', methods=['GET'])
def player_eidolon_stats():
    # You might want to return some sort of response...
    query_parameters = request.args

    discord_id = query_parameters.get('discordID')
    character_id = query_parameters.get('characterID')
    eidolon_name = query_parameters.get('eidolonName')

    metadata = MetaData(schema="pwm")
    if request.method == 'GET':
        try:

            with db.connect() as conn:
                player_eidolons_table = Table('eidolonPlayerStats', metadata, autoload=True, autoload_with=conn)
                select_st = select([player_eidolons_table]).where(player_eidolons_table.c.discord_id == discord_id)
                res = conn.execute(select_st)
                eidolons_built = [{column: value for column, value in rowproxy.items()} for rowproxy in res]
                return jsonify(eidolons_built)
        except Exception as err:
            print(err)
            if conn:
                conn.close()
            db.dispose()

@app.route('/api/v1/playerStats/soulstones', methods=['GET', 'POST'])
def soulstone_stats():
    # You might want to return some sort of response...
    metadata = MetaData(schema="pwm")
    if request.method == 'GET':
        # You might want to return some sort of response...
        query_parameters = request.args

        discord_id = query_parameters.get('discordID')
        character_id = query_parameters.get('characterID')

        metadata = MetaData(schema="pwm")
        if request.method == 'GET':
            try:

                with db.connect() as conn:
                    player_eidolons_table = Table('soulstonesPlayerStats', metadata, autoload=True, autoload_with=conn)
                    and_condition = []
                    if discord_id:
                        and_condition.append(player_eidolons_table.c.discord_id == discord_id)
                    if character_id:
                        and_condition.append(player_eidolons_table.c.character_id == character_id)
                    select_st = select([player_eidolons_table]).where(
                        and_(
                            player_eidolons_table.c.discord_id == (discord_id if discord_id else player_eidolons_table.c.discord_id),
                            player_eidolons_table.c.character_id == (character_id if character_id else player_eidolons_table.c.character_id),
                        )
                    ).order_by(player_eidolons_table.c.last_updated.desc())
                    res = conn.execute(select_st)
                    eidolons_built = [{column: value for column, value in rowproxy.items()} for rowproxy in res]
                    return jsonify(eidolons_built)
            except Exception as err:
                print(err)
                if conn:
                    conn.close()
                db.dispose()

    if request.method == 'POST':
        soulstone_dict = request.json
        discord_id = int(soulstone_dict['discord_id'])
        character_id = int(soulstone_dict['character_id'])

        try:
            with db.connect() as conn:
                player_soulstones_table = Table('soulstonesPlayerStats', metadata, autoload=True, autoload_with=conn)
                insert_statement = player_soulstones_table.insert().values(discord_id=soulstone_dict['discord_id'], character_id=soulstone_dict['character_id'], soulstones_pic_link=soulstone_dict['soulstones_pic_link'], last_updated=datetime.datetime.now())
                conn.execute(insert_statement)
                select_st = select([player_soulstones_table]).where(
                    and_(
                        player_soulstones_table.c.discord_id == discord_id,
                        player_soulstones_table.c.character_id == character_id
                    )
                )
                res = conn.execute(select_st)
                soulstones_built = [{column: value for column, value in rowproxy.items()} for rowproxy in res]
                return jsonify(soulstones_built)

        except Exception as err:
            print(err)
            if conn:
                conn.close()
            db.dispose()

@app.route('/api/v1/playerStats/gear', methods=['GET', 'POST', 'PUT'])
def gear_stats():
    # You might want to return some sort of response...
    metadata = MetaData(schema="pwm")
    if request.method == 'GET':
        # You might want to return some sort of response...
        query_parameters = request.args

        discord_id = query_parameters.get('discordID')
        character_id = query_parameters.get('characterID')
        gear_type = query_parameters.get('gearType')
        metadata = MetaData(schema="pwm")
        if request.method == 'GET':
            try:

                with db.connect() as conn:
                    player_gear_table = Table('gear', metadata, autoload=True, autoload_with=conn)
                    and_condition = []
                    if discord_id:
                        and_condition.append(player_gear_table.c.discord_id == discord_id)
                    if character_id:
                        and_condition.append(player_gear_table.c.character_id == character_id)
                    select_st = select([player_gear_table]).where(
                        and_(
                            player_gear_table.c.discord_id == (discord_id if discord_id else player_gear_table.c.discord_id),
                            player_gear_table.c.character_id == (character_id if character_id else player_gear_table.c.character_id),
                            player_gear_table.c.gear_type == (gear_type if gear_type else player_gear_table.c.gear_type)
                        )
                    )
                    res = conn.execute(select_st)
                    eidolons_built = [{column: value for column, value in rowproxy.items()} for rowproxy in res]
                    return jsonify(eidolons_built)
            except Exception as err:
                print(err)
                if conn:
                    conn.close()
                db.dispose()

    if request.method == 'POST':
        gear_dict = request.json
        discord_id = int(gear_dict['discord_id'])
        character_id = int(gear_dict['character_id'])
        gear_pic = gear_dict['gear_pic']
        text_detected = detect_text_uri(gear_pic)
        possible_gear_types = ['weapon', 'armor', 'pants', 'helmet', 'gloves', 'cape', 'belt', 'pants',
                               'necklace', 'shoes', 'love mirror', 'owner sigil', 'sack', 'ring']
        gear_type = None
        if text_detected:
            gear_type = [gear_text.lower() for gear_text in possible_gear_types if
                         gear_text.lower() in text_detected.lower()]
        if gear_type:
            gear_type = gear_type[0]
        else:
            gear_type = 'unsorted'
        try:
            with db.connect() as conn:
                player_gear_table = Table('gear', metadata, autoload=True, autoload_with=conn)
                insert_statement = player_gear_table.insert().values(discord_id=gear_dict['discord_id'], character_id=gear_dict['character_id'], gear_pic=gear_dict['gear_pic'], gear_type=gear_type, last_updated=datetime.datetime.now())
                conn.execute(insert_statement)
                select_st = select([player_gear_table]).where(
                    and_(
                        player_gear_table.c.discord_id == discord_id,
                        player_gear_table.c.character_id == character_id
                    )
                )
                res = conn.execute(select_st)
                soulstones_built = [{column: value for column, value in rowproxy.items()} for rowproxy in res]
                return jsonify(soulstones_built)

        except Exception as err:
            print(err)
            if conn:
                conn.close()
            db.dispose()

    if request.method == 'PUT':
        gear_dict = request.json
        updated_player_gear = update_gear_pic(gear_dict)
        return jsonify(updated_player_gear)

def update_gear_pic(gear_dict):
    metadata = MetaData(schema="pwm")
    try:
        with db.connect() as conn:
            discord_id = int(gear_dict['discord_id'])
            character_id = int(gear_dict['character_id'])
            former_gear_pic = gear_dict['former_gear_pic']
            gear_pic = gear_dict['gear_pic']
            gear_type = gear_dict['gear_pic']
            player_gears_table = Table('gear', metadata, autoload=True, autoload_with=conn)
            update_query = player_gears_table.update()\
                .values(discord_id=discord_id or player_gears_table.c.discord_id, character_id=character_id or player_gears_table.c.character_id, gear_pic=gear_pic, gear_type=gear_type or player_gears_table.c.gear_type, last_updated=datetime.datetime.now()).where(and_(player_gears_table.c.discord_id == discord_id,player_gears_table.c.character_id == character_id, player_gears_table.c.gear_pic == former_gear_pic))
            result = conn.execute(update_query)
            discord_id = discord_id or 0
            character_id = character_id or 0
            select_st = select([discord_id]).where(
                and_(
                    player_gears_table.c.discord_id == discord_id,
                    player_gears_table.c.character_id == character_id,
                    player_gears_table.c.gear_type == gear_type
                )
            )
            res = conn.execute(select_st)
            gathered_discord_char = [{column: str(value) if isinstance(value, int) else value for column, value in rowproxy.items()} for rowproxy in res][0]
            return gathered_discord_char
    except Exception as err:
        print(err)
        if conn:
            conn.close()
        db.dispose()


@app.route('/api/v1/playerStats/sacredbooks', methods=['GET', 'POST', 'PUT'])
def sacred_book_setups():
    # You might want to return some sort of response...
    metadata = MetaData(schema="pwm")
    if request.method == 'GET':
        # You might want to return some sort of response...
        query_parameters = request.args

        discord_id = query_parameters.get('discordID')
        character_id = query_parameters.get('characterID')
        metadata = MetaData(schema="pwm")
        if request.method == 'GET':
            try:
                with db.connect() as conn:
                    player_sacredbook_table = Table('sacredBooksSetupsPlayerStats', metadata, autoload=True, autoload_with=conn)
                    select_st = select([player_sacredbook_table]).where(
                        and_(
                            player_sacredbook_table.c.discord_id == (discord_id if discord_id else player_sacredbook_table.c.discord_id),
                            player_sacredbook_table.c.character_id == (character_id if character_id else player_sacredbook_table.c.character_id),
                        )
                    ).order_by(player_sacredbook_table.c.last_updated.desc())
                    res = conn.execute(select_st)
                    eidolons_built = [{column: value for column, value in rowproxy.items()} for rowproxy in res]
                    return jsonify(eidolons_built)
            except Exception as err:
                print(err)
                if conn:
                    conn.close()
                db.dispose()

    if request.method == 'POST':
        sacredbook_dict = request.json
        discord_id = int(sacredbook_dict['discord_id'])
        character_id = int(sacredbook_dict['character_id'])
        try:
            with db.connect() as conn:
                player_sacredbook_table = Table('sacredBooksSetupsPlayerStats', metadata, autoload=True, autoload_with=conn)
                insert_statement = player_sacredbook_table.insert().values(discord_id=sacredbook_dict['discord_id'], character_id=sacredbook_dict['character_id'], sacredbooks_setup=sacredbook_dict['sacredbooks_setup'], last_updated=datetime.datetime.now())
                conn.execute(insert_statement)
                select_st = select([player_sacredbook_table]).where(
                    and_(
                        player_sacredbook_table.c.discord_id == discord_id,
                        player_sacredbook_table.c.character_id == character_id
                    )
                )
                res = conn.execute(select_st)
                setup_built = [{column: value for column, value in rowproxy.items()} for rowproxy in res]
                return jsonify(setup_built)

        except Exception as err:
            print(err)
            if conn:
                conn.close()
            db.dispose()

@app.route('/api/v1/playerStats/pneumas', methods=['GET', 'POST'])
def pneumas_setups():
    # You might want to return some sort of response...
    metadata = MetaData(schema="pwm")
    if request.method == 'GET':
        # You might want to return some sort of response...
        query_parameters = request.args

        discord_id = query_parameters.get('discordID')
        character_id = query_parameters.get('characterID')
        metadata = MetaData(schema="pwm")
        if request.method == 'GET':
            try:
                with db.connect() as conn:
                    player_pneuma_table = Table('pneumaSetupsPlayerStats', metadata, autoload=True, autoload_with=conn)
                    select_st = select([player_pneuma_table]).where(
                        and_(
                            player_pneuma_table.c.discord_id == (discord_id if discord_id else player_pneuma_table.c.discord_id),
                            player_pneuma_table.c.character_id == (character_id if character_id else player_pneuma_table.c.character_id),
                        )
                    ).order_by(player_pneuma_table.c.last_updated.desc())
                    res = conn.execute(select_st)
                    eidolons_built = [{column: value for column, value in rowproxy.items()} for rowproxy in res]
                    return jsonify(eidolons_built)
            except Exception as err:
                print(err)
                if conn:
                    conn.close()
                db.dispose()

    if request.method == 'POST':
        pneumas_dict = request.json
        discord_id = int(pneumas_dict['discord_id'])
        character_id = int(pneumas_dict['character_id'])
        try:
            with db.connect() as conn:
                player_pneuma_table = Table('pneumaSetupsPlayerStats', metadata, autoload=True, autoload_with=conn)
                insert_statement = player_pneuma_table.insert().values(discord_id=pneumas_dict['discord_id'], character_id=pneumas_dict['character_id'], pneuma_setup=pneumas_dict['pneuma_setup'], last_updated=datetime.datetime.now())
                conn.execute(insert_statement)
                select_st = select([player_pneuma_table]).where(
                    and_(
                        player_pneuma_table.c.discord_id == discord_id,
                        player_pneuma_table.c.character_id == character_id
                    )
                )
                res = conn.execute(select_st)
                setup_built = [{column: value for column, value in rowproxy.items()} for rowproxy in res]
                return jsonify(setup_built)

        except Exception as err:
            print(err)
            if conn:
                conn.close()
            db.dispose()

@app.route('/api/v1/playerStats/sageAndDemon', methods=['GET', 'POST'])
def sage_and_demon_setups():
    # You might want to return some sort of response...
    metadata = MetaData(schema="pwm")
    if request.method == 'GET':
        # You might want to return some sort of response...
        query_parameters = request.args

        discord_id = query_parameters.get('discordID')
        character_id = query_parameters.get('characterID')
        metadata = MetaData(schema="pwm")
        if request.method == 'GET':
            try:
                with db.connect() as conn:
                    player_sage_and_demon_table = Table('sageAndDemon', metadata, autoload=True, autoload_with=conn)
                    select_st = select([player_sage_and_demon_table]).where(
                        and_(
                            player_sage_and_demon_table.c.discord_id == (discord_id if discord_id else player_sage_and_demon_table.c.discord_id),
                            player_sage_and_demon_table.c.character_id == (character_id if character_id else player_sage_and_demon_table.c.character_id),
                        )
                    ).order_by(player_sage_and_demon_table.c.last_updated.desc())
                    res = conn.execute(select_st)
                    eidolons_built = [{column: value for column, value in rowproxy.items()} for rowproxy in res]
                    return jsonify(eidolons_built)
            except Exception as err:
                print(err)
                if conn:
                    conn.close()
                db.dispose()

    if request.method == 'POST':
        sage_and_demon_dict = request.json
        discord_id = int(sage_and_demon_dict['discord_id'])
        character_id = int(sage_and_demon_dict['character_id'])
        try:
            with db.connect() as conn:
                player_sage_and_demon_table = Table('sageAndDemon', metadata, autoload=True, autoload_with=conn)
                insert_statement = player_sage_and_demon_table.insert().values(discord_id=sage_and_demon_dict['discord_id'], character_id=sage_and_demon_dict['character_id'], sage_and_demon_pic=sage_and_demon_dict['sage_and_demon_pic'], last_updated=datetime.datetime.now())
                conn.execute(insert_statement)
                select_st = select([player_sage_and_demon_table]).where(
                    and_(
                        player_sage_and_demon_table.c.discord_id == discord_id,
                        player_sage_and_demon_table.c.character_id == character_id
                    )
                )
                res = conn.execute(select_st)
                setup_built = [{column: value for column, value in rowproxy.items()} for rowproxy in res]
                return jsonify(setup_built)

        except Exception as err:
            print(err)
            if conn:
                conn.close()
            db.dispose()

@app.route('/api/v1/playerStats/miragiaStore', methods=['GET', 'POST'])
def miragia_store_setups():
    # You might want to return some sort of response...
    metadata = MetaData(schema="pwm")
    if request.method == 'GET':
        # You might want to return some sort of response...
        query_parameters = request.args

        discord_id = query_parameters.get('discordID')
        character_id = query_parameters.get('characterID')
        metadata = MetaData(schema="pwm")
        if request.method == 'GET':
            try:
                with db.connect() as conn:
                    player_miragia_store_table = Table('miragiaStorePreview', metadata, autoload=True, autoload_with=conn)
                    select_st = select([player_miragia_store_table]).where(
                        and_(
                            player_miragia_store_table.c.discord_id == (discord_id if discord_id else player_miragia_store_table.c.discord_id),
                            player_miragia_store_table.c.character_id == (character_id if character_id else player_miragia_store_table.c.character_id),
                        )
                    ).order_by(player_miragia_store_table.c.last_updated.desc())
                    res = conn.execute(select_st)
                    eidolons_built = [{column: value for column, value in rowproxy.items()} for rowproxy in res]
                    return jsonify(eidolons_built)
            except Exception as err:
                print(err)
                if conn:
                    conn.close()
                db.dispose()

    if request.method == 'POST':
        miragia_store_dict = request.json
        discord_id = int(miragia_store_dict['discord_id'])
        character_id = int(miragia_store_dict['character_id'])
        try:
            with db.connect() as conn:
                player_miragia_store_table = Table('miragiaStorePreview', metadata, autoload=True, autoload_with=conn)
                insert_statement = player_miragia_store_table.insert().values(discord_id=miragia_store_dict['discord_id'], character_id=miragia_store_dict['character_id'], miragia_store_pic=miragia_store_dict['miragia_store_pic'], last_updated=datetime.datetime.now())
                conn.execute(insert_statement)
                select_st = select([player_miragia_store_table]).where(
                    and_(
                        player_miragia_store_table.c.discord_id == discord_id,
                        player_miragia_store_table.c.character_id == character_id
                    )
                )
                res = conn.execute(select_st)
                setup_built = [{column: value for column, value in rowproxy.items()} for rowproxy in res]
                return jsonify(setup_built)

        except Exception as err:
            print(err)
            if conn:
                conn.close()
            db.dispose()

@app.route('/api/v1/playerStats/artifacts', methods=['GET', 'POST'])
def artifacts():
    # You might want to return some sort of response...
    metadata = MetaData(schema="pwm")
    if request.method == 'GET':
        # You might want to return some sort of response...
        query_parameters = request.args

        discord_id = query_parameters.get('discordID')
        character_id = query_parameters.get('characterID')
        metadata = MetaData(schema="pwm")
        if request.method == 'GET':
            try:
                with db.connect() as conn:
                    player_artifacts_table = Table('artifacts', metadata, autoload=True, autoload_with=conn)
                    select_st = select([player_artifacts_table]).where(
                        and_(
                            player_artifacts_table.c.discord_id == (discord_id if discord_id else player_artifacts_table.c.discord_id),
                            player_artifacts_table.c.character_id == (character_id if character_id else player_artifacts_table.c.character_id),
                        )
                    ).order_by(player_artifacts_table.c.last_updated.desc())
                    res = conn.execute(select_st)
                    eidolons_built = [{column: value for column, value in rowproxy.items()} for rowproxy in res]
                    return jsonify(eidolons_built)
            except Exception as err:
                print(err)
                if conn:
                    conn.close()
                db.dispose()

    if request.method == 'POST':
        artifacts_store_dict = request.json
        discord_id = int(artifacts_store_dict['discord_id'])
        character_id = int(artifacts_store_dict['character_id'])
        try:
            with db.connect() as conn:
                player_artifacts_table = Table('artifacts', metadata, autoload=True, autoload_with=conn)
                insert_statement = player_artifacts_table.insert().values(discord_id=artifacts_store_dict['discord_id'], character_id=artifacts_store_dict['character_id'], artifacts=artifacts_store_dict['artifacts'], last_updated=datetime.datetime.now())
                conn.execute(insert_statement)
                select_st = select([player_artifacts_table]).where(
                    and_(
                        player_artifacts_table.c.discord_id == discord_id,
                        player_artifacts_table.c.character_id == character_id
                    )
                )
                res = conn.execute(select_st)
                setup_built = [{column: value for column, value in rowproxy.items()} for rowproxy in res]
                return jsonify(setup_built)

        except Exception as err:
            print(err)
            if conn:
                conn.close()
            db.dispose()

@app.route('/api/v1/playerStats/gear/type', methods=['GET'])
def get_gear_type():

    # You might want to return some sort of response...
    metadata = MetaData(schema="pwm")
    if request.method == 'GET':
        # You might want to return some sort of response...
        query_parameters = request.args

        discord_id = query_parameters.get('discordID')
        character_id = query_parameters.get('characterID')
        character_id = query_parameters.get('characterID')
        gear_url = query_parameters.get('url')
        pic = urllib.parse.unquote(gear_url)
        if request.method == 'GET':
            try:
                text_detected = detect_text_uri(pic)
                possible_gear_types = ['weapon', 'armor', 'pants', 'helmet', 'gloves', 'cape', 'belt', 'pants',
                                       'necklace', 'shoes', 'love mirror', 'owner sigil', 'sack', 'ring']
                gear_type = None
                if text_detected:
                    gear_type = [gear_text.lower() for gear_text in possible_gear_types if
                                 gear_text.lower() in text_detected.lower()]
                if gear_type:
                    gear_type = gear_type[-1]
                else:
                    gear_type = 'unsorted'
                return jsonify({
                    'gear_pic': pic,
                    'gear_type': gear_type
                })
            except Exception as err:
                print(err)

@app.errorhandler(404)
def page_not_found(e):
    return "<h1>404</h1><p>The resource could not be found.</p>", 404


@app.route('/api/v1/resources/books', methods=['GET'])
def api_filter():
    query_parameters = request.args

    id = query_parameters.get('id')
    published = query_parameters.get('published')
    author = query_parameters.get('author')

    query = "SELECT * FROM books WHERE"
    to_filter = []

    if id:
        query += ' id=? AND'
        to_filter.append(id)
    if published:
        query += ' published=? AND'
        to_filter.append(published)
    if author:
        query += ' author=? AND'
        to_filter.append(author)
    if not (id or published or author):
        return page_not_found(404)

    query = query[:-4] + ';'

    conn = sqlite3.connect('books.db')
    conn.row_factory = dict_factory
    cur = conn.cursor()

    results = cur.execute(query, to_filter).fetchall()

    return jsonify(results)

app.run(jiselConf['apihost'])
