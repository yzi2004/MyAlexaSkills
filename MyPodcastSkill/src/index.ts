import * as Alexa from "ask-sdk-core"
import { Response as AlexaResponse, IntentRequest, SessionEndedRequest, Directive } from "ask-sdk-model";
import * as SyncRequest from "sync-request";

const getAudioFile = function (): string {
    var response = SyncRequest.default(
        'GET',
        "https://www.nhk.or.jp/rj/podcast/rss/chinese.xml"
    );

    if (response.body.toString() == "" || response == undefined) {
        return "";
    }

    var m = response.body.toString().match(/url=\"([\S]+).mp3/);



    return m[0].valueOf().slice(5);
};

const AudioInterfaceCheckHandler: Alexa.RequestHandler = {

    canHandle(handlerInput: Alexa.HandlerInput): boolean {
        try {

            console.log(handlerInput.requestEnvelope.context.System.device.supportedInterfaces);

            return (handlerInput.requestEnvelope.context.System.device.supportedInterfaces.AudioPlayer === undefined);
        } catch (e) {
            console.log("端末はオーディオプレーヤーサポート確認時、エラー発生しました。");
            return true;
        }
    },

    handle(handlerInput: Alexa.HandlerInput): AlexaResponse {
        return handlerInput.responseBuilder
            .speak("この端末はポッドキャストが再生できません。")
            .withShouldEndSession(true)
            .getResponse();
    },
};

const ErrorIntentHandler: Alexa.ErrorHandler = {
    canHandle(handlerInput: Alexa.HandlerInput, error: Error) {
        console.log(error.name);
        return true;
    },

    handle(handlerInput: Alexa.HandlerInput, error: Error) {
        console.log('エラー発生しました。${error.message}');

        return handlerInput.responseBuilder
            .speak('エラーが発生しました。' + error.stack)
            .getResponse();
    }
};

const LaunchRequestHandler: Alexa.RequestHandler = {
    canHandle(handlerInput: Alexa.HandlerInput): boolean {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    async  handle(handlerInput: Alexa.HandlerInput): Promise<AlexaResponse> {

        const requestId = handlerInput.requestEnvelope.request.requestId;
        const token = handlerInput.context.System.apiAccessToken;
        const endpoint = handlerInput.context.System.apiEndpoint;
        const ds = .services.DirectiveService();

        const audio = 'https://s3-ap-northeast-1.amazonaws.com/devio-blog-data/output.mp3';
        const ssml = '<speak>検索を開始します<audio src="' + audio + '" /></speak>';



        var url = getAudioFile();

        return handlerInput.responseBuilder
            .addAudioPlayerPlayDirective("REPLACE_ALL", url, url, 0)
            .withShouldEndSession(true)
            .getResponse();
    },
};


const SessionEndedRequestHandler: Alexa.RequestHandler = {
    canHandle(handlerInput: Alexa.HandlerInput): boolean {
        return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
    },
    handle(handlerInput: Alexa.HandlerInput): AlexaResponse {
        console.log(`Session ended with reason: ${(<SessionEndedRequest>(handlerInput.requestEnvelope.request)).reason}`);
        return handlerInput.responseBuilder.getResponse();
    },
};

exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        AudioInterfaceCheckHandler,
        SessionEndedRequestHandler,
        LaunchRequestHandler
    ).addErrorHandlers(ErrorIntentHandler)
    .lambda();