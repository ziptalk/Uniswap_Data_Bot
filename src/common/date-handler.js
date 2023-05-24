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

  static getCurrentDate() {
    return moment().utc().format('YYYY_MM_DD_HH_mm_ss').toString();
  }

  static getDateOfOneMinuteAgo() {
    const timestamp = moment().utc().valueOf() - 60000;
    return moment(timestamp).utc().format('YYYY-MM-DD-HH-mm').toString();
  }

  static createMomentFromInterval(timestamp, interval) {
    const newMoment = moment(timestamp).utc();
    const minutes = Math.floor(interval / 60000);
    newMoment.minutes(Math.floor(newMoment.minutes() / minutes) * minutes);
    newMoment.seconds(0);
    newMoment.milliseconds(0);
    return newMoment;
  }

  static getMomentsInRange(startMoment, endMoment, interval) {
    const moments = [];
    let currentMoment = moment(startMoment);
    while (currentMoment.isSameOrBefore(endMoment)) {
      moments.push(currentMoment.clone());
      currentMoment.add(interval);
    }
    return moments;
  }
}

module.exports = { DateHandler };
