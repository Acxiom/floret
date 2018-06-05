'use strict';
const logger = require('koa-logger');
const Router = require('koa-router');
const appRouter = new Router();
const Koa = require('koa');
const ip = require('ip');
const bodyParser = require('koa-bodyparser');
const apiDoc = require('swagger-jsdoc');
const fs = require('fs');
const uuidv4 = require('uuid/v4');
const send = require('koa-send');

// core floret services
const Config = require('./config/floret-config.js');
const Gateway = require('./gateway/floret-gateway.js');
const Service = require('./service/floret-service.js');
const Channel = require('./channel/floret-channel.js');
const Subscriber = require('./subscriber/floret-subscriber.js');
const Subscription = require('./subscription/floret-subscription.js');
const Package = require('./package/floret-package.js');

let Floret, app;

{
    // private
    const _host = Symbol('host');
    const _name = Symbol('name');
    const _port = Symbol('port');
    const _uri = Symbol('uri');
    const _appRouter = Symbol('router');
    const _gateway = Symbol('gateway');
    const _listen = Symbol('listen');
    // const _callback = Symbol('callback');
    const _subscribers = Symbol('subscribers');
    const _subscriptions = Symbol('subscriptions');
    const _channels = Symbol('channels');
    const _service = Symbol('service');
    const _baseURL = Symbol('baseURL');
    const _config = Symbol('config');
    const _docPaths = Symbol('docPaths');
    const _disconnected = Symbol('disconnected');
    const _registeredAPIs = Symbol('registeredAPIs');
    const _environmentVars = Symbol('environmentVars');
    const _modules = Symbol('modules');
    const _logging = Symbol('_logging');
    const _root = Symbol('_root');

    // overridable classes
    const _gatewayClass = Symbol('gatewayClass');
    const _subscriberClass = Symbol('subscriberClass');
    const _subscriptionClass = Symbol('subscriptionClass');
    const _channelClass = Symbol('channelClass');
    const _serviceClass = Symbol('serviceClass');
    const _packageClass = Symbol('packageClass');
    const _configClass = Symbol('configClass');

    const _apiDoc = Symbol('apiDoc');


    Floret = class Floret extends Koa {

        constructor(floretConfig, ...[ConfigOverride, GatewayOverride, ChannelOverride, SubscriberOverride, SubscriptionOverride, ServiceOverride, PackageOverride]) {
            // koa
            super();

            if (floretConfig) {
                this.configure(floretConfig, ...[ConfigOverride, GatewayOverride, ChannelOverride, SubscriberOverride, SubscriptionOverride, ServiceOverride, PackageOverride])
                this.configureServices();
            }

            this[_configClass] = Config;
            this[_gatewayClass] = Gateway;
            this[_channelClass] = Channel;
            this[_subscriberClass] = Subscriber;
            this[_subscriptionClass] = Subscription;
            this[_serviceClass] = Service;
            this[_packageClass] = Package;
            this[_appRouter] = appRouter;
            this[_apiDoc] = apiDoc;
            this[_modules] = {};
        }

        configure(floretConfig, ...[ConfigOverride, GatewayOverride, ChannelOverride, SubscriberOverride, SubscriptionOverride, ServiceOverride, PackageOverride]) {
            this[_config] = floretConfig.params;
            this[_host] = this[_config].host;
            this[_name] = this[_config].name;
            this[_port] = this[_config].port;
            this[_root] = this[_config].root;
            this[_uri] = this[_config].uri || '/' + this[_name];
            this[_docPaths] = this[_config].documentationPaths || [];

            this[_listen] = super.listen;

            this[_disconnected] = this[_config].disconnected;
            this[_logging] = this[_config].logging;
            this[_registeredAPIs] = [];
            if (!this[_disconnected]) {

                this[_subscribers] = [];
                this[_subscriptions] = [];

                this[_channels] = {};

                // overrides
                this[_configClass] = ConfigOverride ? ConfigOverride : Config;
                this[_gatewayClass] = GatewayOverride ? GatewayOverride : Gateway;
                this[_channelClass] = ChannelOverride ? ChannelOverride : Channel;
                this[_subscriberClass] = SubscriberOverride ? SubscriberOverride : Subscriber;
                this[_subscriptionClass] = SubscriptionOverride ? SubscriptionOverride : Subscription;
                this[_serviceClass] = ServiceOverride ? ServiceOverride : Service;
                this[_packageClass] = PackageOverride ? PackageOverride : Package;

                this[_gateway] = new this[_gatewayClass]('gw', this[_config].gatewayHost, this[_config].gatewayAdminPort, this[_config].gatewayProxyPort);
                this[_service] = new this[_serviceClass](this[_name], this[_host], this[_port], this[_uri]);
                this[_baseURL] = this[_gateway].ensureProtocol(this[_host]) + ':' + this[_port] + this[_uri];


            }
            this.configureServices();
            this.isInit = false;
            console.log('Configuration complete.');
        }

        configureServices() {
            if (this[_config].channels) {
                this.configureChannels(this[_config].channels);
            }

            if (this[_config].subscriptions) {
                this.configureSubscriptions(this[_config].subscriptions);
            }

            if (this[_config].apis) {
                this.configureAPIs(this[_config].apis);
            }
        }

        /**
         *
         * @param portOverride
         */
        async listen(portOverride) {
            if (!this.isInit) {
                await this.init().then(()=>{}).catch((e) => {throw e});
                console.log('...complete.')
            }
            let srv = await this[_listen](portOverride || this[_port]);
            console.log('Listening on port ' + JSON.stringify(srv.address().port))
            return srv;
        }

        /**
         *
         * @returns {send}
         */
        get serve() {
            return send;
        }

        /**
         *
         * @returns {boolean}
         */
        async init() {

            try {
                console.log(`Initializing ${this[_name]}:`);
                console.log(`...routes prefixed [${this[_uri]}]`);
                this.router.prefix(this[_uri]);

                if (!this[_disconnected]) {

                    await this[_gateway].gatewayHealthCheck();
                    console.log('...gateway verified');

                    await this.publishFloretConfig();
                    console.log(`...floret spec created: (${this[_uri]}/floret.json)`);

                    await this.createHealthCheck();
                    console.log(`...healthcheck created: (${this[_uri]}/healthcheck)`);

                    await this.createSubscriberAPI();
                    console.log('...subscriber api created');

                    await this.initChannels();
                    console.log('...channels initialized');

                    await this.initSubscriptions();
                    console.log('...subscriptions initialized');

                    await this.registerAPIs();
                    console.log('...apis registered');

                    if (this[_config].publishDocs) {
                        await this.publishAPIDocumentation(this[_docPaths]);
                        console.log('...api documentation published');
                    }
                }

                this.use(bodyParser());

                if (this[_logging]) {
                    this.use(logger());
                }

                this.use(async (ctx, next) => {
                    ctx.body = ctx.request.body;
                    await next();
                });

                this.use(this.router.routes());
                this.use(this[_appRouter].allowedMethods());

                this.isInit = true;
                return true;

            } catch (e) {
                console.log('Error occurred during floret init routine.');
                console.log(e);
                throw e;
            }
        }

        /**
         *
         * @returns {*}
         */
        get name() {
            return this[_name];
        }

        /**
         *
         * @returns {*}
         */
        get host() {
            return this[_host];
        }

        /**
         *
         * @returns {*}
         */
        get port() {
            return this[_port];
        }

        /**
         *
         * @returns {string}
         */
        get url() {
            return this[_host] + ':' + this[_port];
        }

        /**
         *
         * @returns {*}
         */
        get service() {
            return this[_service];
        }

        get Service() {
            return this[_serviceClass];
        }

        /**
         *
         * @returns {*}
         */
        get router() {
            return this[_appRouter];
        }

        /**
         *
         * @returns {*}
         */
        get gateway() {
            return this[_gateway];
        }

        get Gateway() {
            return this[_gatewayClass];
        }
        /**
         *
         * @returns {*}
         * @constructor
         */
        get Package() {
            return this[_packageClass];
        }

        /**
         *
         * @param pkg
         * @constructor
         */
        set Package(pkg) {
            this[_packageClass] = pkg;
        }

        get config() {
            return this[_config];
        }
        /**
         *
         * @returns {*}
         * @constructor
         */
        get Config() {
            return this[_configClass]
        }

        /**
         *
         * @param cfg
         * @constructor
         */
        set Config(cfg) {
            this[_configClass] = cfg;
        }

        /**
         *
         * @returns {*}
         */
        get apiDoc() {
            return this[_apiDoc];
        }

        /**
         *
         * @returns {*}
         */
        get uri() {
            return this[_uri];
        }

        /**
         *
         * @param u
         */
        set uri(u) {
            this[_uri] = u;
        }

        /**
         *
         * @returns {*}
         */
        get baseURL() {
            return this[_baseURL];
        }

        /**
         *
         * @returns {*}
         */
        get baseURI() {
            return this[_uri];
        }

        /**
         *
         */
        createHealthCheck() {
            this[_appRouter].get('/healthcheck/ping', (ctx, next) => {
                ctx.set('Content-Type', 'text/plain');
                ctx.body = "OK";
            });

            this[_appRouter].get('/healthcheck/', async (ctx, next) => {
                let gwHealth = await this[_gateway].gatewayHealthCheck();

                ctx.body = {
                    "ping": {
                        "healthy": true
                    },
                    "api-gateway": {
                        "healthy": gwHealth.status ===  'active',
                        "message": "api gateway at " + this[_gateway].url
                    }
                }
            });

            this.registerAPI(this[_name], this[_uri] + '/healthcheck', ['GET', 'OPTIONS']);
            this.registerAPI(this[_name] + "-ping", this[_uri] + '/healthcheck/ping', ['GET', 'OPTIONS']);
        }

        publishFloretConfig() {
            this[_appRouter].get('/floret.json', (ctx, next) => {
                ctx.body = this[_config];
            });

            this.registerAPI(this[_name] + '-config', this[_uri] + '/floret.json', ['GET', 'OPTIONS']);
        }

        /** API *******************************************************************************************************/

        /**
         *
         * @param name
         * @returns {*}
         */
        async getAPI(name) {
            // console.log('$$$' + JSON.stringify(this.gateway.getAPI(name)))
            let api;
            try {
                let api = await this.gateway.getAPI(name);
                return api;
            } catch(e){
                //throw e;
                return {};
            }
        }

        get registeredAPIs() {
            return this[_registeredAPIs];
        }

        set registeredAPIs(arr) {
            this[_registeredAPIs] = arr;
        }

        async registerAPIs() {
            console.log('...registering apis')
            return await this[_registeredAPIs].map( async (api) => {
                await this.registerAPI(api.name, api.uri, api.methods).then ( () => {
                }).catch((e) => { console.log('Unable to register api ' + api.name)});
            });
        }
        /**
         *
         * @param name
         * @param uri
         * @param methods
         */
        async registerAPI(name, uri, methods) {
            console.log('......registering api ' + name);
            return await this[_gateway].addAPI(this.prependName(name), [this.prependUri(uri)], `${this[_host]}:${this[_port]}${this.prependUri(uri)}`, methods).then(() => {

            }).catch((e) => {
                if (e.statusCode !== 409) {
                    console.log('api could not be registered. ' + e.message);
                    throw e;
                }
            })
        }

        /**
         *
         * @param name
         * @param uri
         * @param methods
         */
        async registerExternalAPI(name, uri, url, methods) {
            await this[_gateway].addAPI(name, [this[_uri] + uri], url, methods).then(() => {

            }).catch((e) => {

                if (e.statusCode !== 409) {
                    console.log('api could not be registered. ' + e.message);
                    throw e;
                }
            })
        }

        prependUri(uri) {
            if (uri.indexOf(this[_uri]) < 0) {
                return this[_uri] + uri;
            }
            return uri;
        }

        prependName(name) {
            if (name.indexOf(this[_name]) < 0) {
                return `${this[_name]}-${name}`;
            }
            return name;
        }

        configureAPIs(apis) {
            let newApis = apis.map( (api) => {

                if (api.path) {
                    require(`${this[_root]}${api.path}`)(this);
                }
                api.uri = this.prependUri(api.uri);
                return api;
            });

            this[_registeredAPIs] = this[_registeredAPIs].concat(newApis);
        }
        /**
         *
         * @param name
         * @returns {*}
         */
        async deleteAPI(name) {
            return this.gateway.deleteAPI(name);
        }

        /**
         * @param uri
         * @param method
         * @param payload
         * @param gateway
         * @returns {*|any|XMLHttpRequest}
         */
        async apiRequest(uri, method, payload, trackingId, gatewayOverride) {
            let gw = gatewayOverride || this[_gateway];
            console.log('api request WITH TRACKING ID ' + trackingId)
            trackingId = trackingId || uuidv4();

            let options = {
                method: method,
                uri: gw.proxyURL + uri,
                header: {
                    'Content-Type': 'application/json'
                }
            };
            options.body = payload || {};
            if (method.indexOf('post')) {
                options.header['Content-Type'] = 'application/json'
            }

            if (!options.body.trackingId) {
                console.log('setting to ' + trackingId);
                options.body.trackingId = trackingId;
            } else {
                console.log("USING EXISTING TRACKING ID " + trackingId)
            }

            let res = await gw.send(options);
            res.trackingId = trackingId;
            console.log('floret request id: ' + trackingId);
            return res;
        }

        /** API Docs **************************************************************************************************/
        /**
         *
         * @param newPaths
         * @returns {Promise<void>}
         */
        async publishAPIDocumentation(newPaths = []) {
            console.log('...creating OpenAPI Spec')
            let apiSpec = this.buildAPISpec(newPaths);

            await this.registerAPI(`${this[_name]}_api-spec.json`, '/api-spec.json', ['GET', 'POST', 'DELETE']).then((res) => {

            }).catch((e) => {
                if (e.statusCode != 409) {
                    console.log('error registering api' + e.message);
                }
            });

            let channel = await this.createAPISpecChannel();

            // subscribe
            channel.broadcast(this.name, {"url": this.apiSpecURL});

            // console.log('created and broadcast new channel')
            // send a message to the document service
            let options = {
                uri: this.gateway.proxyURL + '/api-doc/specs',
                method: 'GET'
            };

            // notify api-doc service to refresh spec list
            await this.gateway.publishAPISpec(options).then(() => {

            }).catch((e) => {
                console.log(`Default document service not found (${this.gateway.proxyURL}/api-doc/specs)`);
            });

        }

        /**
         *
         * @returns {Promise<*>}
         */
        async createAPISpecChannel() {
            let channelConfig =
                {
                    "name": `api-spec`,
                    "description": "api spec",
                    "hostURL": this.host,
                    "hostPort": this.port,
                    "uri": `/api-spec`,
                    "endpoint": `${this.url}${this.uri}/api-spec`
                };

            let channel = new this[_channelClass](channelConfig);
            await this.addChannel(channel);
            return this.channels[channelConfig.name]
        }

        /**
         *
         * @returns {string}
         */
        get apiSpecURL() {
            return `${this.url}${this.uri}}/api-spec.json`;
        }

        /**
         *
         * @param channel
         * @returns {Promise<void>}
         */
        async attachDocService(channel) {

        }

        /**
         *
         * @param newPaths
         */
        buildAPISpec(documentedCodePaths = []) {
            let swaggerDefinition = {
                info: {
                    title: `${this.name}`,
                    version: '1.0.0',
                    description: 'A sample API',
                },
                host: this.gateway.proxyURL.split('http://')[1],
                basePath: '/'
            };

            // Options for the swagger docs
            let options = {
                swaggerDefinition: swaggerDefinition,
                apis: documentedCodePaths
            };

            let swaggerSpec = this[_apiDoc](options);

            swaggerSpec.paths[`${this.uri}/subscribe`] = {
                "post": {
                    "summary": "subscribe to channel",
                    "operationId": "subscribe",
                    "tags": ["floret"],
                    "responses": [
                        {
                            "200": {
                                "name": "floret subscription id"
                            },
                            "201": {
                                "description": "Null response"
                            }
                        }]
                },
                "delete": {
                    "summary": "unsubscribe to channel",
                    "operationId": "subscribe",
                    "tags": ["floret"],
                    "responses": [
                        {
                            "200": {
                                "name": "floret subscription id"
                            },
                            "201": {
                                "description": "Null response"
                            }
                        }]
                }
            };

            swaggerSpec.paths[`${this.uri}/healthcheck`] =
                {
                    "get": {
                        "summary": "returns an active health status when running",
                        "operationId": "healthcheck",
                        "tags": ["floret"],
                        "responses": [
                            {
                                "200": {
                                    "status": "active"
                                }
                            }]
                    }
                };

            swaggerSpec.paths[`${this.uri}/floret.json`] =
                {
                    "get": {
                        "summary": "returns an floret configuration",
                        "operationId": "floret",
                        "tags": ["floret"],
                        "responses": [
                            {
                                "200": {

                                }
                            }]
                    }
                };


            this.router.get('/api-spec.json', function (ctx) {
                ctx.set('Content-Type', 'application/json');
                ctx.body = swaggerSpec;
            });


            return swaggerSpec;
        }

        /**
         *
         * @returns {Promise<*>}
         */
        async discoverAPISpecs() {
            let apis = await this[_gateway].discoverAPISpecs();
            console.log('apis resolvesd ' + JSON.stringify(apis))
            return apis;
        }

        /** Channels **************************************************************************************************/
        /**
         *
         */
        async initChannels() {

            let gatewayChannels = await this.discoverChannels();

            for (let key in gatewayChannels) {
                if (this[_channels][key]) {
                    delete gatewayChannels[key];
                } else {
                    this[_channels][key] = gatewayChannels[key];
                }
            }

            this[_channels] = Object.assign(this[_channels], gatewayChannels);

            for (let key in this[_channels]) {
                await this.initChannel(this[_channels][key]);
            }
        }

        addChannels(channelArray) {
            channelArray.map((chan) => {
                this[_channels][chan.name] = chan;
            });
        }

        configureChannels(chanConfigArr) {
            // configuration-based channels
            chanConfigArr.map( (ch) => {
                ch.endpoint = this.baseURL;
                ch.serviceName = this[_name];
                let channel = this.addChannel(new this.Channel(ch))
            });
        }

        /**
         *
         * @param channel
         */
        async initChannel(channel) {
            await this.createChannelAPI(channel);
            await this.discoverSubscribers(channel);
            console.log("......initialized channel " + channel.name);
        }

        /**
         *
         * @returns {*}
         * @constructor
         */
        get Channel() {
            return this[_channelClass];
        }

        /**
         *
         * @param channel
         * @constructor
         */
        set Channel(channel) {
            this[_channelClass] = channel;
        }

        addChannel(channel) {
            this[_channels][channel.name] = channel;
        }

        /**
         *
         * @returns {*}
         */
        get channels() {
            return this[_channels];
        }

        /**
         *
         * @returns {*|Observable.<R>|any}
         */
        async discoverChannels() {
            let prefix = this[_name] + '_channels_';
            let registeredChannels = await this[_gateway].discoverChannels();
            // return channels in object format
            let channelMap = registeredChannels.reduce((accObj, chan) => {
                // create a channel object
                let chanName = chan.name.split(prefix)[1];
                let serviceName = chan.name.split(prefix)[0];

                if (serviceName === this[_name]) {
                    let chanConfig = {
                        "endpoint": chan.upstream_url,
                        "name": chanName,
                        "description": chan.description,
                        "serviceName": this[_name],
                        "uri": chan.uris[0]
                    };

                    accObj[chanName] = new this.Channel(chanConfig);
                }
                return accObj;
            }, {});
            return channelMap;
        }

        /**
         *
         * @param channel
         */
        async createChannelAPI(channel) {
            channel.apiName = this[_name] + '_channels_' + channel.name;

            await this[_gateway].createChannelAPI(channel.apiName, `/${this[_name]}/channels/${channel.name}/`, `${this[_service].baseURL}${channel.uri}`, ['GET', 'POST'])
                .then((res) => {

                }).catch((e) => {
                    if (e.statusCode !== 409) {
                        console.log('error adding new subscriber api. ' + e.message);
                        throw e;
                    } else {
                        console.log('Channel endpoint already exists: ' + channel.apiName);
                    }
                });
        }

        /**
         *
         * @param channel
         */
        updateChannel(channel) {
            let name = channel.name;
            for (let i = 0; i < this[_channels].length; i++) {
                if (this[_channels][i].config().name === name) {
                    this[_channels][i] = channel;
                }
            }
        }

        /**
         *
         * @param channel
         */
        async deleteChannel(channel) {
            let channelInfo = channel.config();

            this[_gateway].deleteChannelAPI(channelInfo.apiName).then(() => {
                for (let i = 0; i < this[_channels].length; i++) {
                    if (this[_channels][i].name === channel.name) {
                        this[_channels].splice(i, 1);
                        i++;
                    }
                }
            });
        }

        /** Subscribers ***********************************************************************************************/

        /**
         *
         * @returns {*}
         * @constructor
         */
        get Subscriber() {
            return this[_subscriberClass];
        }

        /**
         *
         * @param subscriber
         * @constructor
         */
        set Subscriber(subscriber) {
            this[_subscriberClass] = subscriber;
        }

        /**
         *
         * @returns {*}
         */
        async discoverSubscribers(channel) {
            let subscribers = await this[_gateway].discoverSubscribers(this[_name]);

            subscribers.filter((sub) => {
                // ensure the name starts with serviceName_subscribers
                return sub.name.indexOf(`${this[_name]}_subscribers_`) === 0;
            }).map((sub) => {
                let name = sub.name;
                let nameParts = name.split('_');
                let channelName = nameParts[nameParts.length - 1];

                if (channel.name === channelName) {
                    let subObj = new this.Subscriber(sub.name, sub.upstream_url)
                    if (!this.channels[channelName].subscribers[name]) {
                        this.attachSubscriber(this.channels[channelName], subObj);
                    }
                }
            });

            return subscribers;
        }

        attachSubscriber(channel, subscriber) {
            if (channel && subscriber) {
                if (!channel.subscribers[subscriber.name]) {
                    channel.subscribe(subscriber);
                }
            }
        }

        /**
         *
         */
        async createSubscriberAPI() {
            await this[_gateway].addAPI(this[_name] + '_subscribe', [this[_uri] + '/subscribe'], this[_host] + ':' + this[_port] + '/' + this[_name] + '/subscribe', ['GET','POST', 'DELETE', 'OPTIONS']).then(() => {

            }).catch((e) => {
                if (e.statusCode !== 409) {
                    throw e;
                }
            });

            // creates a subscriber endpoint.
            this[_appRouter].post('/subscribe/', async (ctx, next) => {

                let subRequest = ctx.request.body;
                let subscriberName = this[_name] + '_subscribers' + '_' + subRequest.name + '_' + subRequest.channel;

                ctx.body = {
                    "name": subscriberName
                };

                let newSubscriber = new this.Subscriber(subscriberName, subRequest.url);
                let subURI = `\/${this[_name]}\/channels\/${subRequest.channel}\/subscribers\/${subRequest.name}`;
                this.attachSubscriber(this.channels[subRequest.channel], newSubscriber);

                let addApi = await this[_gateway].addAPI(subscriberName, [subURI], subRequest.url, ['GET','POST','OPTIONS'])
                    .then((res) => {

                    }).catch((e) => {
                        if (e.statusCode !== 409) {
                            console.log('error adding new subscriber api. ' + e.message);
                            throw e;
                        } else {
                            console.log('Subscriber endpoint already exists: ');

                        }
                    });
                })
                .delete('/subscribe', async (ctx) => {
                    let {channelName, subscriberName} = ctx.body;
                    if (channelName && subscriberName && this[_channels][channelName]) {
                        this[_channels][channelName].unsubscribe(subscriberName);
                    }
                    // should be empty
                    ctx.body = {
                        "result": this[_channels][channelName].subscribers[subscriberName]
                    }
                })
                .get('/subscribers/', (ctx, next) => {
                    ctx.body = this[_subscribers];
                })
                .patch('/subscribers/:name', (ctx, next) => {
                    let event = ctx.body;
                })
                .put('/subscribers/:name', (ctx, next) => {
                    let event = ctx.body;
                });
        }

        async subscribe(serviceName, channelName, subscription) {
            let res = await this.gateway.subscribeTo(serviceName, channelName, subscription.name, subscription.endpoint);
            return res.name;
        }

        async unsubscribe(serviceName, channelName, subscriberName) {
            await this.gateway.unsubscribe(serviceName, channelName, subscriberName);
            await this.gateway.deleteAPI(subscriberName);
        }

        /**
         *
         * @param channelName
         * @returns {Array|Array.<T>|*|Observable|any}
         */
        subscribersByChannel(channelName) {
            return this[_subscribers].filter((sub) => {
                return sub.channel === channelName;
            })
        }

        /**
         *
         * @param channelName
         */
        removeChannelSubscribers(channelName) {
            this[_subscribers] = this[_subscribers].filter((sub) => sub.channel === channelName);
        }

        /** Subscriptions *********************************************************************************************/

        /**
         *
         */

        async initSubscriptions() {
            this[_subscriptions].map((sub) => {
                sub.init();
                console.log("......initialized subscription " + sub.name);
            });
        }

        addCustomAPI(api) {
            this[_registeredAPIs].push(api);
        }

        addSubscription(subscription) {
            if (this[_subscriptions].filter((sub) => sub.name === subscription.name).length < 1) {
                this[_subscriptions].push(subscription);
            } else {
                console.warn('subscription already exists')
            }
        }

        getSubscriptionByName(name) {
            let sub = this[_subscriptions].filter((sub) => {
                return sub.name === name;
            });
            return sub[0];
        }

        async refreshSubscriptions() {
            this[_subscriptions] = await this.discoverSubscriptions();
            for (let key in this[_subscriptions]) {
                this[_subscriptions][key].init();
            }

            return this[_subscriptions];
        }

        configureSubscriptions(subs) {
            subs.map((sub) => {

                let newSub = new this.Subscription(sub.name, this.service, this.router, this.gateway);
                let path = sub.path;
                let handler = require(`${this[_root]}${path}`)(this);

                newSub.observable.subscribe(handler.onEvent);
                this.addSubscription(newSub);
                this.subscribe(sub.service, sub.channel, newSub).then((res) => {

                }).catch((e) => {
                    console.log(`Unabled to subscribe to ${sub.service}-${sub.channel} (${e.message})`)
                })
            });
        }

        /**
         *
         */
        async discoverSubscriptions() {
            let subscriptions = await this[_gateway].discover(`${this[_name]}_subscription_`);
            return subscriptions.filter((sub) => sub.name.indexOf(`${this[_name]}_subscribers_`) === 0);
        }

        get Subscription() {
            return this[_subscriptionClass];
        }

        /**
         *
         * @returns {*}
         */
        get subscriptions() {
            return this[_subscriptions]
        }

        /**
         *
         * @param subArray
         */
        set subscriptions(subArray) {
            this[_subscriptions] = subArray;
        }

        createConfig (cfg, service, host, port, uri, gatewayHost, gatewayAdminPort, gatewayProxyPort, disconnected) {
            return new this[_configClass](cfg, service, host, port, uri, gatewayHost, gatewayAdminPort, gatewayProxyPort, disconnected);
        }

        attachModule(name, fn) {
            this[_modules][name] = fn;
        }

        getModule(name) {
            return this[_modules][name];
        }

        get environmentVariables() {
            return this[_environmentVars];
        }

        set environmentVariables(env) {
            this[_environmentVars] = env
        }

        createEnvConfig(envVars) {
            let envStr='local', host, port, name, uri, gatewayHost, gatewayAdminPort, gatewayProxyPort, disconnected, root, config, envObj;
            this[_environmentVars] = envVars;

            if (envVars){
                envStr = envVars.FLORET_ENV_KEY || 'local';
                host = envVars.FLORET_HOST;
                port = envVars.FLORET_PORT;
                name = envVars.FLORET_NAME;
                uri = envVars.FLORET_URI;
                gatewayHost = envVars.FLORET_GATEWAY_HOST;
                gatewayAdminPort = envVars.FLORET_GATEWAY_ADMIN_PORT;
                gatewayProxyPort = envVars.FLORET_GATEWAY_PROXY_PORT;
                disconnected = envVars.FLORET_IS_DISCONNECTED;
                root = envVars.FLORET_ROOT;
            }

            root = envStr === 'local' ? envVars.PWD : root;
            config = JSON.parse(fs.readFileSync(`${root}/floret.json`, 'utf8'));
            config.root = root;

            if (!config.environments) {
                config.environments = {
                    local: {
                        gatewayAdminPort: 8001,
                        gatewayProxyPort: 8000,
                    }
                };
            }

            if ((envStr === 'local')) {
                config.environments[envStr].gatewayHost = `${ip.address()}`;
                config.environments[envStr].host = `${ip.address()}`;
                config.root = root;
            }

            envObj = Object.assign({}, config.environments[envStr]);
            delete config.environments;

            return this.createConfig (Object.assign({}, config, envObj), name, host, port,  uri, gatewayHost, gatewayAdminPort, gatewayProxyPort, disconnected);
        }


    }
}

module.exports = Floret;