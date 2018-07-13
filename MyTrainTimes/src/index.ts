import * as Alexa from "ask-sdk-core"
import { Response as AlexaResponse, IntentRequest, SessionEndedRequest } from "ask-sdk-model";
import models from "./Models"
import moment from "moment";

const HELP_SPEECH = "現時点、新宿方面を行くの場合、新宿方面、と言ってください。小田原方面を行くの場合、小田原方面、と言ってください。"
    + "10分以後出発の場合、10分後、又は、10分後の新宿方面、と言ってください。"
    + "指定時間出発の場合、平日の午前8時半から、又は、休日の午後4時12分から新宿方面、と言ってください。";

const GetTrainSch = function (weekDay: string, timeBase: moment.Moment, dir: string,
    output: (speech: string, cardTitle: string, cardContent: string) => void): void {

    var IsHoliday = weekDay == "" ? (timeBase.day() == 0 || timeBase.day() == 6) : weekDay == "休日";
    var IsUp = (dir == "UP");
    var timeTable = IsUp ? (IsHoliday ? models.TimeTable.Holiday.UP : models.TimeTable.WeekDay.UP) :
        (IsHoliday ? models.TimeTable.Holiday.DOWN : models.TimeTable.WeekDay.DOWN);
    var timeLine = timeBase.format("HHmm").replace(/^00/, '24').replace(/^01/, '25');
    var speech = "";
    var cardTitle = timeBase.format("HH:mm") + "から出発：";
    for (var i = 0; i < timeTable.length; i++) {
        var item = timeTable[i];

        if (item.tm > timeLine) {
            speech += item.tm.substring(0, 2).replace(/^0{1}/, '').replace("24", "0").replace("25", "1") + "時" +
                item.tm.substring(2).replace(/^0{1}/, '') + "分です。";

            if (IsUp) {
                if (item.ntm !== "") {
                    var train = "快速急行";
                    if (item.typ !== "") {
                        train = item.typ;
                    }

                    speech += "あと、新百合ヶ丘駅に" + item.ntm + "の" + train + "を乗り換えできます。";
                }

                if (item.cm !== "") {
                    speech += item.cm;
                }
            }
            break;
        }
    }

    if ((timeBase.date() == 0 || timeBase.date() == 1) && speech == "") {
        speech = "最終便に乗れなかった。"
    }

    output(speech, cardTitle, speech);
};

const GetDir = function (handlerInput: Alexa.HandlerInput): string {
    var station = (<IntentRequest>handlerInput.requestEnvelope.request).intent.slots.Station.value;
    var dir = "";
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    if (sessionAttributes.Dir != undefined && sessionAttributes.Dir != "") {
        dir = sessionAttributes.Dir;
    }

    if (station === "新宿" || station === "新百合ヶ丘" || station === "登戸") {
        dir = "UP";
    }
    else if (station === "町田" || station === "小田原" || station === "江ノ島") {
        dir = "DOWN";
    }

    if (dir == "") {
        dir = "UP"
    }

    sessionAttributes.Dir = dir;
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    return dir;
};

const GetTimeBase = function (handlerInput: Alexa.HandlerInput): moment.Moment {

    var timeBase = moment().utcOffset(9);
    var timeSpan = (<IntentRequest>handlerInput.requestEnvelope.request).intent.slots.AfterMinute.value;
    var fromTime = (<IntentRequest>handlerInput.requestEnvelope.request).intent.slots.FromTime.value;
    if (timeSpan != undefined) {
        timeBase = timeBase.add(parseInt(timeSpan), "minute");
    } if (fromTime != undefined) {
        timeBase = moment(fromTime, ["HH:mm"], "ja-JP");
    }

    return timeBase;
};

const CheckSoltValue = function (request: IntentRequest): boolean {

    var station = request.intent.slots.Station.value;
    var afterMinute = request.intent.slots.AfterMinute.value;
    var fromTime = request.intent.slots.FromTime.value;
    var WeekDay = request.intent.slots.WeekDay.value;

    if (station == undefined && afterMinute == undefined && fromTime == undefined && WeekDay == undefined) {
        return false;
    }

    if (afterMinute != undefined && parseInt(afterMinute) == NaN) {
        return false;
    }

    if (WeekDay != "平日" && WeekDay != "休日") {
        return false;
    }

    return true;
}

const ErrorIntentHandler: Alexa.ErrorHandler = {
    canHandle(handlerInput: Alexa.HandlerInput, error: Error) {
        console.log(error.name);
        return true;
    },

    handle(handlerInput: Alexa.HandlerInput, error: Error) {
        console.log("エラー発生しました。" + error.message);

        return handlerInput.responseBuilder
            .getResponse();
    }
};


const CheckTrainTimeIntentHandler: Alexa.RequestHandler = {
    canHandle(handlerInput: Alexa.HandlerInput): boolean {
        return handlerInput.requestEnvelope.request.type === "IntentRequest" &&
            handlerInput.requestEnvelope.request.intent.name === "CheckTrainTimeIntent" &&
            CheckSoltValue(handlerInput.requestEnvelope.request);
    },

    handle(handlerInput: Alexa.HandlerInput): AlexaResponse {

        var dir = GetDir(handlerInput);
        var weekDay = (<IntentRequest>handlerInput.requestEnvelope.request).intent.slots.WeekDay.value;
        var timeBase = GetTimeBase(handlerInput);
        var _speech = "", _cardTitle = "", _cardContent = "";

        GetTrainSch(weekDay, timeBase, dir, (speech, cardTitle, cardContent) => {
            _speech = speech;
            _cardTitle = cardTitle;
            _cardContent = cardContent;
        });

        if (_speech == "") {
            _speech = "すみません、検索できない、駅から直接お問い合わせください。";
            _cardTitle = "対象データ無し。";
            _cardContent = "駅から直接お問い合わせください。";
        }
        return handlerInput.responseBuilder
            .speak(_speech)
            .withSimpleCard(_cardTitle, _cardContent)
            .reprompt("別に検索がありますか?")
            .getResponse();
    }
};

const HelpIntentHandler: Alexa.RequestHandler = {
    canHandle(handlerInput: Alexa.HandlerInput): boolean {
        return handlerInput.requestEnvelope.request.type === "IntentRequest" &&
            (handlerInput.requestEnvelope.request.intent.name === "AMAZON.HelpIntent");
    },

    handle(handlerInput: Alexa.HandlerInput): AlexaResponse {

        return handlerInput.responseBuilder
            .speak(HELP_SPEECH)
            .reprompt(HELP_SPEECH)
            .getResponse();
    }
};


const DoFinishIntentHandler: Alexa.RequestHandler = {
    canHandle(handlerInput: Alexa.HandlerInput): boolean {
        return handlerInput.requestEnvelope.request.type === "IntentRequest" &&
            (handlerInput.requestEnvelope.request.intent.name === "AMAZON.CancelIntent" ||
                handlerInput.requestEnvelope.request.intent.name === "AMAZON.NoIntent" ||
                handlerInput.requestEnvelope.request.intent.name === "AMAZON.StopIntent");
    },

    handle(handlerInput: Alexa.HandlerInput): AlexaResponse {
        return handlerInput.responseBuilder
            .withSimpleCard("じゃね", "ご利用ありがとうございました。")
            .speak("じゃね、またよろしく。")
            .getResponse();
    }
};

const NotUnderstandHandler: Alexa.RequestHandler = {
    canHandle(handlerInput: Alexa.HandlerInput): boolean {
        return true;
    },

    handle(handlerInput: Alexa.HandlerInput): AlexaResponse {
        return handlerInput.responseBuilder
            .speak("すみません、よくわかりません。")
            .reprompt(HELP_SPEECH)
            .getResponse();
    }
};

const LaunchRequestHandler: Alexa.RequestHandler = {
    canHandle(handlerInput: Alexa.HandlerInput): boolean {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle(handlerInput: Alexa.HandlerInput): AlexaResponse {
        return handlerInput.responseBuilder
            .speak("柿生駅の電車時刻です。どうぞよろしく。")
            .withSimpleCard("柿生駅の時刻表", "どうぞよろしく")
            .reprompt("新宿方面ですか、又は小田原方面ですか。")
            .getResponse();
    },
};

exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        HelpIntentHandler,
        CheckTrainTimeIntentHandler,
        DoFinishIntentHandler,
        NotUnderstandHandler
    ).addErrorHandlers(ErrorIntentHandler)
    .lambda();