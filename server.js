const puppeteer = require('puppeteer');

const idNumberElementId = "#ctl00_cphBody__loginView_tbUserId";
const UserCodeElementId = "#ctl00_cphBody__loginView_tbUserName";
const PasswordElementId = "#ctl00_cphBody__loginView_tbPassword";
const loginButtonElementId = "#ctl00_cphBody__loginView_btnSend";

require('dotenv').config();

const mailAddress = process.env.MAIL_ADDRESS;
const mailPassword = process.env.MAIL_PASSWORD;
const id = process.env.ID;
const userCode = process.env.USER_CODE;
const clalitPassword = process.env.CLALIT_PASSWORD;

const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: mailAddress,
      pass: mailPassword
    }
  });

setTimeout(main, 0);
setInterval(main, 30 * 60 * 1000);

async function main(){
    console.log("Starting...");
    const browser = await puppeteer.launch({/* headless: false */});
    const page = await browser.newPage();
    await page.goto('https://e-services.clalit.co.il/OnlineWeb/General/Login.aspx');

    await Login(page);

    await page.goto('https://e-services.clalit.co.il/OnlineWeb/Services/Tamuz/TamuzTransfer.aspx');
    await new Promise(r => setTimeout(r, 500));

    let elementHandle = await page.waitForSelector('#ifrmMainTamuz');
    let frame = await elementHandle.contentFrame();

    // get the current visit date
    await frame.waitForSelector("#patientLastDoctors + #visits span.visitDateTime");
    const currentVisitDateElement = await frame.$("#patientLastDoctors + #visits span.visitDateTime");
    const innerHtmlProperty = await currentVisitDateElement.getProperty('innerText');
    const currentVisitDate = await innerHtmlProperty.jsonValue();
    
    // get the update button and click it
    await frame.waitForSelector("#patientLastDoctors + #visits a.updateVisitButton");
    const updateVisitButtonElement = await frame.$("#patientLastDoctors + #visits a.updateVisitButton");
    await updateVisitButtonElement.click();
    await updateVisitButtonElement.click();

    // get the next free date
    elementHandle = await page.waitForSelector('#ifrmMainTamuz');
    frame = await elementHandle.contentFrame();

    await frame.waitForSelector("header.margin-right");
    const headerElement = await frame.$("header.margin-right");
    const headerInnerTextProperty = await headerElement.getProperty('innerText');
    const headerText = await headerInnerTextProperty.jsonValue();
    const splittedHeader = headerText.split(" ");
    const nextFreeDate = splittedHeader[splittedHeader.length - 1];

    console.log("current visit date: " + currentVisitDate);
    console.log("next free date: " + nextFreeDate);

    if(getDateFromString(currentVisitDate) > getDateFromString(nextFreeDate)) {
        console.log("you need to re-schedule your visit.");
        SendMail(currentVisitDate, nextFreeDate);
    }

    console.log("done");
    console.log();
    console.log();

    await browser.close();
}


async function Login(page) {
    await page.waitForSelector(idNumberElementId);
    await page.waitForSelector(UserCodeElementId);
    await page.waitForSelector(PasswordElementId);
    await page.waitForSelector(loginButtonElementId);


    await page.$eval(idNumberElementId, (el, value) => el.value = value, id);
    await page.$eval(UserCodeElementId, (el, value) => el.value = value, userCode);
    await page.$eval(PasswordElementId, (el, value) => el.value = value, clalitPassword);
    await new Promise(r => setTimeout(r, 500));

    await page.$eval(loginButtonElementId, el => el.click());
    await new Promise(r => setTimeout(r, 3000));
    console.log("login done");
}

function getDateFromString(dateString) {
    const splitted = dateString.split(".");
    return new Date(splitted[2], splitted[1] - 1, splitted[0]);
}

function SendMail(currentVisitDate, nextFreeDate) {
    message = {
        from: 'liors12357@gmail.com',
        to: 'lior.swisa@intel.com, liors12357@gmail.com',
        subject: 'hello world',
        text: 'there is an earlier turn!!!! go take it!!\n\ncurrent visit date: ' + currentVisitDate + '\nnext free date: ' + nextFreeDate
    }
    
    transporter.sendMail(message, function(err, info) {
        if (err) {
          console.log(err)
        }
    });
}