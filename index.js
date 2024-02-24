const Telegraf = require('telegraf');
const { Telegram } = require('telegraf');
const { CronJob } = require('cron');
const moment = require('moment');
const _ = require('lodash');

moment.locale('uk');

const Parser = require('./parser');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({
    silent: true,
    path: `${__dirname}/.env`
  });
}

const app = new Telegraf(process.env.BOT_TOKEN, { username: process.env.BOT_USERNAME });
const telegram = new Telegram(process.env.BOT_TOKEN, { username: process.env.BOT_USERNAME });

const members = [];

function writeToBESTGroup(message, parse_mode = 'Markdown') {
  return telegram.sendMessage(process.env.BEST_GROUP_ID, message, {
    parse_mode
  });
}

function sendBirthdaySticker() {
  const stickers = [
    'CAADBAAD0AIAAlI5kwawwS2UUaU0XQI',
    'CAADAgADcgADc0LMDyd8hVRS-CprAg',
    'CAADAgAD1QMAAkf7CQwoyLJSjqmU3wI',
    'CAADBAADzg0AAnW1oAy3tg3_2on9IQI',
    'CAADBAAD2g0AAnW1oAzjXgnZK-koFAI',
    'CAADBAAD4A0AAnW1oAy5taMN38ReTwI'
  ];
  return telegram.sendSticker(process.env.BEST_GROUP_ID, stickers[Math.trunc(Math.random() * stickers.length)]);
}

function checkBirthday() {
  const now = moment().utcOffset(120);
  const membersWithBirthdayToday = members
    .map(({ fullName, birthday, birthdayThisYear }) => {
      return {
        fullName,
        birthday,
        birthdayThisYear
      };
    })
    .filter(m => now.isSame(m.birthdayThisYear, 'day'));

  if (membersWithBirthdayToday.length > 0) {
    writeToBESTGroup(
      [
        `🍰 *ЧЄЛІКІ!* 🍰`,
        `*ДЕНЬ НАРОДЖЕННЯ!*`,
        `Вітаємо наш${membersWithBirthdayToday.length > 1 ? 'их' : 'ого'} мембер${
          membersWithBirthdayToday.length > 1 ? 'ів' : 'а'
        }:`,
        membersWithBirthdayToday.map(m => `*${m.fullName} (${now.diff(m.birthday, 'years')} років)*`).join('\n')
      ].join('\n')
    ).then(sendBirthdaySticker);
  }
}

function setHandlers() {
  app.command('next', ctx => {
    const now = moment().utcOffset(120);
    const membersWithNearestBirthday = members
      .map(({ fullName, birthday, birthdayThisYear }) => {
        return {
          fullName,
          birthday,
          birthdayThisYear,
          daysBeforeBirthday: -now.diff(birthdayThisYear, 'days') + 1
        };
      })
      .filter(m => m.daysBeforeBirthday > 1)
      .sort((m1, m2) => m1.daysBeforeBirthday - m2.daysBeforeBirthday)
      .reduce((acc, member) => {
        if (!acc.length || member.daysBeforeBirthday === acc[0].daysBeforeBirthday) {
          acc.push(member);
        }
        return acc;
      }, []);
    const firstMember = membersWithNearestBirthday[0];
    return ctx.replyWithMarkdown(
      [
        `Наступний День Народження:`,
        membersWithNearestBirthday.map(m => `*${m.fullName}*`).join('\n'),
        `🍰 *${firstMember.birthday.format('DD MMMM')}* 🍰`,
        `Залишилось днів: *${firstMember.daysBeforeBirthday}*`
      ].join('\n')
    );
  });
  app.command('/write', ctx => {
    if (String(ctx.message.from.id) === String(process.env.ADMIN_ID)) {
      const message = ctx.message.text.replace(/^\/write/, '').trim();
      writeToBESTGroup(message);
    }
  });
  app.on('sticker', ctx => ctx.reply('Класний стікер 👍'));
  app.startPolling();
}

function startCron() {
  const birthdayCheckJob = new CronJob({
    cronTime: '0 0 9 * * *',
    onTick: checkBirthday,
    timeZone: 'Europe/Kiev'
  });
  birthdayCheckJob.start();
}

Parser.getMembers()
  .then(m => {
    members.push(...m);
  })
  .then(setHandlers)
  .then(startCron)
  .catch(console.error);
