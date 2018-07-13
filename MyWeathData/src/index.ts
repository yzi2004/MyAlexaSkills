import * as Alexa from "ask-sdk-core"
import { Response as AlexaResponse, IntentRequest, SessionEndedRequest } from "ask-sdk-model";
import * as SyncRequest from "sync-request";
import { cast, Castable } from '@bitr/castable';

class TempVal extends Castable {
    @cast celsius: string;
    @cast fahrenheit: string;
}

class Temp extends Castable {
    @cast min: TempVal;
    @cast max: TempVal;
}

class Forecast extends Castable {
    @cast dateLabel: string;
    @cast telop: string;
    @cast temperature: Temp;
}

class Desc extends Castable {
    @cast text: string;
}

class Location extends Castable {
    @cast city: string;
    @cast area: string;
    @cast prefecture: string;
}

class Weather extends Castable {
    @cast forecasts: Forecast[];
    @cast title: string;
    @cast description: Desc;
    @cast location: Location;
    @cast publicTime: string;
}

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

const unescapeUnicode = function (str: string): string {
    return str.replace(/\\u([a-fA-F0-9]{4})/g, function (m0, m1) {
        return String.fromCharCode(parseInt(m1, 16));
    });
};

const GetWeatherCityID = function (city: string): string {
    switch (city) {
        case "東京":
            return "130010";
        case "千葉":
            return "120010";
        case "銚子":
            return "120020";
        case "館山":
            return "120030";
        case "小田原":
            return "140020";
        case "横浜":
            return "140010";
        case "さいたま":
            return "110010";
        case "熊谷":
            return "110020";
        case "秩父":
            return "110030";
        default:
            return "140010";
    }
}

const GetWeatherData = function (city: string): string {
    var response = SyncRequest.default(
        'GET',
        "http://weather.livedoor.com/forecast/webservice/json/v1?city=" + city
    );

    var weatherInfo = unescapeUnicode(response.body.toString());
    const weather = new Weather(JSON.parse(weatherInfo));

    var speechText = weather.location.prefecture + weather.location.city + "の天気情報です。";
    weather.forecasts.forEach(item => {
        speechText += item.dateLabel + "は" + item.telop + "です。";
        if (item.temperature.max != null && item.temperature.max != undefined) {
            speechText += "最高気温は" + item.temperature.max.celsius + "度。"
        }
        if (item.temperature.min != null && item.temperature.min != undefined) {
            speechText += "最低気温は" + item.temperature.min.celsius + "度。";
        }
    });

    speechText += "<break time=\"1s\"/>" + weather.description.text.replace(/\n/g, "");

    const pubTime: Date = new Date(weather.publicTime.slice(0, 19).replace(/-/g, "/").replace(/T/g, " "));
    speechText += "<break time=\"1s\"/>発表時間は" + (pubTime.getMonth() + 1).toString() + "月";
    speechText += pubTime.getDay().toString() + "日の";
    speechText += pubTime.getHours().toString() + "時";
    speechText += pubTime.getMinutes().toString() + "分です。";

    return speechText;
}

const DoFinishIntentHandler: Alexa.RequestHandler = {
    canHandle(handlerInput: Alexa.HandlerInput): boolean {
        return handlerInput.requestEnvelope.request.type === "IntentRequest" &&
            (handlerInput.requestEnvelope.request.intent.name === "AMAZON.CancelIntent" ||
                handlerInput.requestEnvelope.request.intent.name === "AMAZON.NoIntent" ||
                handlerInput.requestEnvelope.request.intent.name === "AMAZON.StopIntent");
    },

    handle(handlerInput: Alexa.HandlerInput): AlexaResponse {
        return handlerInput.responseBuilder
            .withSimpleCard("じゃね", "ご利用ありがとうございました。まだよろしく。")
            .speak("じゃね、まだよろしく。")
            .getResponse();
    }
};

const WeatherRequestHandler: Alexa.RequestHandler = {
    canHandle(handlerInput: Alexa.HandlerInput): boolean {
        return (handlerInput.requestEnvelope.request.type === 'LaunchRequest') || (
            handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
            handlerInput.requestEnvelope.request.intent.name === "LocalWeatherIntent");
    },
    async  handle(handlerInput: Alexa.HandlerInput): Promise<AlexaResponse> {
        var area = "140010";

        if (handlerInput.requestEnvelope.request.type === "IntentRequest") {
            var city = (<IntentRequest>handlerInput.requestEnvelope.request).intent.slots.City.value;
            if (city != undefined && city != "") {
                area = GetWeatherCityID(city);
            }
        }

        const speechText = GetWeatherData(area);

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt("別場所を探しているか？")
            .getResponse();
    },
};

exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        WeatherRequestHandler,
        DoFinishIntentHandler
    ).addErrorHandlers(ErrorIntentHandler)
    .lambda();