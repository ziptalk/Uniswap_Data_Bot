const moment = require('moment');

class DateHandler {
  static async getYearMonthDate(timestamp = moment().utc().valueOf()) {
    const timestampToMoment = moment(Number(timestamp)).utc();
    const year = timestampToMoment.year();
    const month =
      timestampToMoment.month() + 1 < 10
        ? `0${timestampToMoment.month() + 1}`
        : timestampToMoment.month() + 1;
    const date =
      timestampToMoment.date() < 10
        ? `0${timestampToMoment.date()}`
        : timestampToMoment.date();
    return { year, month, date };
  }

  static getCurrentTimestamp() {
    return moment().utc().valueOf();
  }

  static getDateOfOneMinuteAgo() {
    const timestamp = moment().utc().valueOf() - 60000;
    return moment(timestamp).utc().format('YYYY-MM-DD-HH-mm').toString();
  }
}

module.exports = { DateHandler };
