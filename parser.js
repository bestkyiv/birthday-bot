const fs = require('fs');
const moment = require('moment');
const path = require('path');

function getFileContent() {
  return new Promise((resolve, reject) => {
    fs.readFile(path.join(__dirname, './members.csv'), (err, data) => {
      if (err) return reject(err);
      resolve(String(data));
    });
  });
}

function parseMembers(rawCSV) {
  const lines = rawCSV.split('\n').filter(l => l);
  const headers = lines[0].split(',');
  return lines.slice(1).reduce((members, line) => {
    const m = line
      .replace(/["\n]/g, '')
      .split(',')
      .reduce((member, cell, index) => {
        member[headers[index]] = cell.trim();
        return member;
      }, {});
    return members.concat(m);
  }, []);
}

function mapRequiredInfo(members) {
  return members.map(m => {
    let phoneNumber = m['Телефон'].replace(/\D/g, '');
    phoneNumber = phoneNumber.startsWith('38') ? `+${phoneNumber}` : `+38${phoneNumber}`;

    return {
      surname: m['Фамилия'],
      name: m['Имя'],
      fathers: m['Отчество'],
      fullName: `${m['Фамилия']} ${m['Имя']}`,
      telegram: m.Telegram,
      faculty: m['Факультет'],
      group: (m['Группа'] && m['Группа'].replace(/_/g, '-')) || '',
      email: m['e-mail'],
      phone: phoneNumber,
      status: m['Статус'] || 'Observer',
      isAlumni: !!(m['Статус'] && m['Статус'].match(/alumni/i)),
      birthday: moment(m['ДР'], 'DD.MM.YYYY').utcOffset(120),
      birthdayThisYear: m['ДР']
        ? moment(`${m['ДР'].match(/\d+.\d+/)[0]}.${moment().year()}`, 'DD.MM.YYYY').utcOffset(120)
        : moment().add(3, 'years')
    };
  });
}

exports.getMembers = function() {
  return getFileContent()
    .then(parseMembers)
    .then(mapRequiredInfo);
};
