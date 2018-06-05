const Rx = require('rxjs');
let FloretSubscription;

{
    const _name = Symbol('name');
    const _service = Symbol('service');
    const _router = Symbol('router');
    const _gateway = Symbol('gateway');
    const _endpoint = Symbol('endpoint');
    const _uri = Symbol('uri');
    const _subject = Symbol('subject');

    FloretSubscription = class FloretSubscription {
        constructor(name, service, router, gateway) {
            this[_name] = name;
            this[_router] = router;
            this[_gateway] = gateway;
            this[_service] = service;
            this[_endpoint] = `${this[_gateway].proxyURL}/${this[_service].name}/subscription/${this[_name]}`;
            this[_uri] =  `/subscription/${this[_name]}`;
            this[_subject] = new Rx.Subject();
        }

        async init() {
            await this.createSubscriptionAPI();
            await this.createSubscriptionEndpoint();
        }

        async createSubscriptionAPI(){
            let gatewayAPIName = `${this[_service].name}_subscription_${this[_name]}`;
            let url =  `${this[_service].baseURL}/subscription/${this[_name]}`;
            this[_endpoint] = `${this[_gateway].proxyURL}/${this[_service].name}/subscription/${this[_name]}`;
            await this[_gateway].addAPI(gatewayAPIName, [`/${this[_service].name}/subscription/${this[_name]}`], url, ['POST']);
        }

        async createSubscriptionEndpoint() {
            return await this[_router].post( this[_uri], (msg) => {
                this[_subject].next(msg);
            });
        }

        get subscriptionURL() {
            return this[_endpoint];
        }
        get name() {
            return this[_name];
        }

        set name(name) {
            this[_name] = name;
        }

        get uri() {
            return this[_uri];
        }

        set uri(uri) {
            this[_uri] = uri;
        }

        get endpoint() {
            return this[_endpoint];
        }

        set endpoint(endpoint) {
            this[_endpoint] = endpoint;
        }

        get service() {
            return this[_service];
        }

        get gateway() {
            return this[_gateway];
        }

        get router() {
            return this[_router];
        }

        get observable() {
            return this[_subject];
        }

        set observable(sub) {
            this[_subject] = sub;
        }
    }
}

module.exports = FloretSubscription;