const config = {
    "url": "https://gateway-a.watsonplatform.net/visual-recognition/api/v3/",
    "api_key": "c896536089fc9a40d6e8f4348125e95dbd1d1e69",
    "classifiers": {
	    "violence": "Violence_1327604523",
	    "sexual": "Violence_1327604523"
    }
}

const functions = require('firebase-functions');
const express = require('express');
const axios = require('axios');
// const bodyParser = require('body-parser');
const app = express();
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);
const databaseRef = admin.database().ref();

app.post('/new', (req, res) => {
  let url = req.body.url;
  let url_hash = hashCode(url); // hashed int value as key
  let classifier_name = req.query.classifier;
  let req_url = `${config.url}classify?version=2016-05-20&api_key=${config.api_key}&classifier_ids=${config.classifiers[classifier_name]}&url=${url}`;
  console.log(req_url);
  axios.get(req_url)
  .then(response => {
    if (response.data.images[0].classifiers.length <= 0) {
      res.status(200).send("no related class found");
      return;
    }
    let top_class = getTopClass(response.data.images[0].classifiers[0].classes);
    let img_ref = databaseRef.child(classifier_name + '/' + top_class + "/" + url_hash);

    img_ref.once('value').then(snapshot => {
      let new_report_count = snapshot.val() != null ? snapshot.val().report_count + 1 : 1;
      img_ref.set({ url: url, report_count: new_report_count });
      res.status(200).send("posting stuff to violence -> img: " + url + " of class: " + top_class);
    });
  })
  .catch(error => {
    console.error(error);
    res.status(500).send("internal error");
  });

});

const getTopClass = (all_classes) => {
  let max_score = 0;
  let top_class;
  all_classes.forEach( (cls) => {
    if(cls.score > max_score){
      max_score = cls.score;
      top_class = cls.class;
    }
  });
  return top_class;
}

const hashCode = (str) => {
    var hash = 0;
    if (str.length == 0) return hash;
    for (i = 0; i < str.length; i++) {
        char = str.charCodeAt(i);
        hash = ((hash<<5)-hash)+char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}

exports.classifiers = functions.https.onRequest(app);
