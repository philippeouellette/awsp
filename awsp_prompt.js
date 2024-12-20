#!/usr/bin/env node

const { profile } = require('console');
const fs = require('fs');
const inquirer = require('inquirer');
const inquirerSearchList = require('inquirer-search-list');

// Register the plugin with inquirer
inquirer.registerPrompt('search-list', inquirerSearchList);

console.log('AWS Profile Switcher');

const homeDir = process.env['HOME']
const profileRegex = /\[profile .*]/g;
const accountIDRegex = /sso_account_id \= .*/g; 
const bracketsRemovalRegx = /(\[profile )|(\])/g;
const accountIDSaninitizingRegx = /(sso_account_id \=)/g;
const defaultProfileChoice = '';

const promptProfileChoice = (data) => {
  const matches = data.match(profileRegex);

  if (!matches) {
    console.log('No profiles found.');
    console.log('Refer to this guide for help on setting up a new AWS profile:');
    console.log('https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html');

    return;
  }

  const profiles = matches.map((match, index) => {
    const sanitizedProfileName = match.replace(bracketsRemovalRegx, '');
    const accountIDMatch = data.match(accountIDRegex);
    let accountID = '';

    if (accountIDMatch && accountIDMatch[index]) {
        accountID = accountIDMatch[index].replace(accountIDSaninitizingRegx, '').trim();
    }

    return `${sanitizedProfileName} ([${accountID}])`;
  });

  const accountID = matches.map((match) => {
    return match.replace(accountIDSaninitizingRegx, '');
  });

  profiles.push(defaultProfileChoice);

  profiles.tostring += ' ' + accountID.tostring;

  profiles.sort();

  const profileChoice = [
    {
      type: 'search-list',
      name: 'profile',
      message: 'Start typing to filter profiles',
      choices: profiles,
      default: process.env.AWS_PROFILE || defaultProfileChoice
    }
  ];

  return inquirer.prompt(profileChoice);
}

const readAwsProfiles = () => {
  return new Promise((resolve, reject) => {
    fs.readFile(`${homeDir}/.aws/config`, 'utf8', (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

const writeToConfig = (answers) => {
  const profileChoice =
        answers.profile === defaultProfileChoice ? '' : answers.profile.toString().split(" (")[0].trim();

  return new Promise((resolve, reject) => {
    fs.writeFile(`${homeDir}/.awsp`, profileChoice, { flag: 'w' }, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

readAwsProfiles()
  .then(promptProfileChoice)
  .then(writeToConfig)
  .catch(error => {
    console.log('Error:', error);
    process.exit(1);
  });
