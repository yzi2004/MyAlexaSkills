import * as Alexa from "ask-sdk-core"
import { Response as AlexaResponse, IntentRequest, SessionEndedRequest } from "ask-sdk-model";
import moment from "moment";

const GenSpeech = function (date: moment.Moment, output: (speech: string, cardTitle: string) => void): void {
    var speech = date.format("MM月DD日 dddd") + "です。";
    var weekDay = date.day();
    var cardTitle = "";
    if (weekDay == 0 || weekDay == 6) {
        speech += "ごみ収集がありません。";
        cardTitle = "ごみ収集がありません。";
    } else if (weekDay == 1) {
        speech += "プラスチックごみを収集です。";
        cardTitle = "プラスチックごみを収集です。";
    } else if (weekDay == 2 || weekDay == 5) {
        speech += "普通ごみを収集です。";
        cardTitle = "普通ごみを収集です。";
    } else if (weekDay == 3) {
        cardTitle = "ミックスペーパーを収集です。";
        speech += cardTitle;
    } else if (weekDay == 4) {
        cardTitle = "空き缶、ペットボトル、空きびんをを収集です。";

        var weeksOfMonth = Math.floor(date.date() / 7);
        var firstWeekDay = date.date(1).day();

        if (firstWeekDay <= 4) {
            weeksOfMonth++;
        }

        if (weeksOfMonth == 2 || weeksOfMonth == 4) {
            cardTitle += "あと、" + weeksOfMonth.toString() + "回目の木曜日のて、粗大ごみや小物金属も収集します。";

        }

        speech += cardTitle;
    }

    output(speech, cardTitle);
}

const CheckTomorrowIntentHandler: Alexa.RequestHandler = {
    canHandle(handlerInput: Alexa.HandlerInput): boolean {
        return handlerInput.requestEnvelope.request.type === "IntentRequest" &&
            (handlerInput.requestEnvelope.request.intent.name === "AMAZON.YesIntent" ||
                handlerInput.requestEnvelope.request.intent.name === "TomorrowIntent");
    },

    handle(handlerInput: Alexa.HandlerInput): AlexaResponse {
        var tomorrow = moment().locale("ja").utcOffset(9).add(1, "days");

        var _speech = "", _cardTitle = "";
        GenSpeech(tomorrow, (speech, cardTitle) => { _speech = speech; _cardTitle = cardTitle; });

        return handlerInput.responseBuilder
            .speak(_speech)
            .withSimpleCard(_cardTitle, "")
            .getResponse();
    }
};

const DoFinishIntentHandler: Alexa.RequestHandler = {
    canHandle(handlerInput: Alexa.HandlerInput): boolean {
        return handlerInput.requestEnvelope.request.type === "IntentRequest" &&
            (handlerInput.requestEnvelope.request.intent.name === "AMAZON.CancelIntent" ||
                handlerInput.requestEnvelope.request.intent.name === "FinishIntent" ||
                handlerInput.requestEnvelope.request.intent.name === "AMAZON.StopIntent");
    },

    handle(handlerInput: Alexa.HandlerInput): AlexaResponse {
        return handlerInput.responseBuilder
            .speak("ザイジェン、後でまた話しましょう")
            .getResponse();
    }
};

const LaunchRequestHandler: Alexa.RequestHandler = {
    canHandle(handlerInput: Alexa.HandlerInput): boolean {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle(handlerInput: Alexa.HandlerInput): AlexaResponse {

        var today = moment().locale("ja").utcOffset(9);

        var _speech = "", _cardTitle = "";

        GenSpeech(today, (speech, cardTitle) => { _speech = speech; _cardTitle = cardTitle; });

        return handlerInput.responseBuilder
            .speak(_speech)
            .withSimpleCard(_cardTitle, "")
            .reprompt("明日の収集種類も確認でしょうか？")
            .getResponse();
    },
};

const NotUnderstandHandler: Alexa.RequestHandler = {
    canHandle(handlerInput: Alexa.HandlerInput): boolean {
        return true;
    },

    handle(handlerInput: Alexa.HandlerInput): AlexaResponse {
        return handlerInput.responseBuilder
            .speak("すみません、よくわかりません。")
            .reprompt("明日の収集種類も確認でしょうか？")
            .getResponse();
    }
};

const ErrorIntentHandler: Alexa.ErrorHandler = {
    canHandle(handlerInput: Alexa.HandlerInput, error: Error) {
        return true;
    },

    handle(handlerInput: Alexa.HandlerInput, error: Error) {
        console.log('エラー発生しました。${error.message}');

        return handlerInput.responseBuilder
            .getResponse();
    }
};

exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        DoFinishIntentHandler,
        CheckTomorrowIntentHandler,
        NotUnderstandHandler
    ).addErrorHandlers(ErrorIntentHandler)
    .lambda();