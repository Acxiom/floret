
let FloretPackage;

{
    let _sender = Symbol('sender');
    let _receiver = Symbol('receiver');
    let _channel = Symbol('channel');
    let _payload = Symbol('payload');
    let _trackingId = Symbol('trackingId');

    FloretPackage = class FloretPackage {

        constructor(config) {
            this[_sender] = config.sender;
            this[_receiver] = config.receiver;
            this[_channel] = config.channel;
            this[_payload] = config.payload;
            this[_trackingId] = config.trackingId;
        }

        toJSON() {
            return {
                "sender": this.sender,
                "receiver": this.receiver,
                "channel": this.channel,
                "payload": this.payload,
                "trackingId": this.trackingId
            }
        }

        get sender(){
            return this[_sender];
        }

        set sender(send){
            this[_sender] = send;
        }
        get receiver(){
            return this[_receiver];
        }

        set receiver(rec){
            this[_receiver] = rec;
        }
        get channel(){
            return this[_channel];
        }

        set channel(chan){
            this[_channel] = chan;
        }

        get payload(){
            return this[_payload];
        }

        set payload(pl){
            this[_payload] = pl;
        }

        get trackingId(){
            return this[_trackingId];
        }

        set payload(pl){
            this[_trackingId] = pl;
        }
    }
}

module.exports = FloretPackage;