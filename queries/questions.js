let pool = require('../clientpool');
const fetch = require("node-fetch");
const {api} = require('../config.json');

const gatherPlayerStatsQuestions = function gatherPlayerStatsQuestions() {
  return pool
    .connect()
    .then(client => {
      return client
        .query('SELECT * FROM pwm."playerStatsQuestions"', [])
        .then(res => {
          client.release();
          console.log(res.rows[0]);
          return res.rows
        })
        .catch(err => {
          client.release();
          console.log(err.stack)
        })
    })

};

const fetchQuestions = function fetchQuestions() {
  return fetch(`http://${api}:5000/api/v1/playerStats/questions`, {
    method: 'GET',
    headers: {
      'content-type': 'application/json',
    }
  })
    .then(response => {
      return response.json()
    })
    .then((question) => question)
    .catch(err => {
      console.log(err)
    });
};



module.exports = {
  gatherPlayerStatsQuestions: gatherPlayerStatsQuestions,
  fetchQuestions: fetchQuestions
};