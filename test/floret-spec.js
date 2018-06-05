const assert = require('chai').assert;
const expect = require('chai').expect;
const sinon = require('sinon');
const supertest = require('supertest');
const mockery = require('mockery');
const chai = require('chai');
const chaiHttp = require('chai-http');
const Bluebird = require('bluebird');
const Rx = require('rxjs');
const ip = require('ip');
let rp = require('request-promise');
let request = require('request');


chai.use(chaiHttp);

let requestStub;
describe('Floret', () => {
    let Floret = require('../lib/floret');
    let floret = new Floret();
    let server, request;
    const
        gatewayHost = ip.address(),
        gatewayProxyPort = 8000,
        gatewayAdminPort = 8001,
        servicePort = 8096,
        serviceHost = ip.address(),
        serviceName = "unit-test-floret",
        serviceURI = "/unit-test-floret";

    let config = {
        "name": serviceName,
        "port": servicePort,
        "uri": serviceURI,
        "host": serviceHost,
        "root": "../",
        "environments": {
            local:
                {
                    gatewayHost: gatewayHost,
                    gatewayProxyPort: gatewayProxyPort,
                    gatewayAdminPort: gatewayAdminPort
                }
        },
        publishDocs: true
    };

    let floretConfig = new floret.Config(config);
    let spy;
    // start floret service

    let rpPostStub, rpGetStub;
    before (async () => {
        request = sinon.stub(rp, 'Request');
        request.resolves({
              "statusCode": 200
            });
        rpPostStub = sinon.stub(rp, 'post'); // mock rp.post() calls
        rpGetStub = sinon.stub(rp, 'get');// calls to rp.post() return a promise that will resolve to an object

        rpPostStub.returns(Bluebird.resolve({
            fakedResponse: 'Post will return exactly this'
        }));

        rpGetStub.returns(Bluebird.resolve({
            fakedResponse: 'Get will return exactly this'
        }));

        floret.configure(floretConfig);

        require('./gateway.stubs')(sinon, floret);

        server =  await floret.listen();
        request = await supertest(server);

        return request;
    });

    it('should have a healthcheck endpoint', async () => {
         //requestStub.yields(null, {statusCode: 200}, {login: "bulkan"});
         return await request
            .get(floret.baseURI + '/healthcheck')
            .expect('Content-Type', /json/)
            .expect(200)
            .then( (res) => {
                expect(JSON.parse(res.text).ping.healthy).equals(true);
            })
    });

    it('should suppress 409 error', () => {

    });

    it('should throw non-409 errors', () =>{

    });

    it('should return its name', () => {
        expect(floret.name).equals(serviceName);
    });

    it('should return its host', () =>{
        expect(floret.host).equals(serviceHost);
    });

    it('should return its port', () => {
        expect(floret.port).equals(servicePort);
    });

    it('should return its baseURL', () =>{
        expect(floret.baseURL).equals('http://' + serviceHost + ":" + servicePort + "/" + serviceName);
    });

    it('should return its url', () =>{
        expect(floret.url).equals(serviceHost + ":" + servicePort);
    });

    it('should return its baseURI', () =>{
        expect(floret.baseURI).equals(serviceURI);
    });

    it('should return its uri', () => {
        expect(floret.uri).equals(serviceURI);
    });

    it('should return a Service object', () =>{
        assert.instanceOf(floret.service, floret.Service);
    });

    it('should return a router object', () => {
        assert.isObject(floret.router);
    });

    it('should return a Gateway object', () => {
        assert.instanceOf(floret.gateway, floret.Gateway);
    });

    it('should return a config object', () => {
        assert.instanceOf(new floret.Config(floret.config), floret.Config);
    });


    describe('API', () => {
        it('should get api by name', async () =>{
            console.log(floret.getAPI('apiTest'))
            let api = await floret.getAPI('apiTest');
            expect(api.name).equals("apiTest");
        });

        it('should return empty object when not found', () =>{
            assert.isEmpty(floret.getAPI());

        });

        it('should register api at gateway', () =>{

        });

        it('should fail on unsuccessful api registration', () =>{

        });

        it('should register external apis at gateway', () =>{

        });

        it('should fail when it cannot register external apis at gateway', () =>{

        });

        it('should delete api from gateway', () =>{
            let spy = sinon.spy(floret.gateway, 'deleteAPI');
            floret.deleteAPI('foo');
            assert(spy.callCount === 1);
            spy.restore();
        });

        it('should delete all apis from gateway', async () => {
            /*
            let spy = sinon.spy(floret.gateway, 'deleteAPI');
            //let newStub = sinon.stub(floret.gateway, 'getAPIs');
            await floret.gateway.deleteAllAPIs();
            //newStub.resolves(apis);
            console.log('(spy.callCount' + (spy.callCount))
            assert(spy.callCount === 2);
            spy.restore();
            */
        });



    });

    describe('API Docs', () => {
        it('should serve an api spec', () =>{
            return request
                .get(floret.baseURI + '/api-spec.json')
                .expect('Content-Type', /json/)
                .expect(200)
                .then( (res) => {
                    expect(JSON.parse(res.text).info.title).to.equal(floret.name);
                })
        });

        it('should build and return the api spec', () =>{
            expect(floret.buildAPISpec([]).info.title).to.equal(floret.name);
        });

        it('should discover all api specs', async () =>{
            let specs = await floret.discoverAPISpecs();
            expect(specs[0].name).to.equal('apiSpec1')
        });
    });

    describe('Channels', () => {

        let channels, testChannel, rpSpy, handlerFn;

        before(async () => {
            // create a new channel
            let testName = "channel-test";
            handlerFn=  (options) => {
                return rp.post(options);
            };
            rpSpy = sinon.spy(handlerFn);

            testChannel = new floret.Channel(
                {
                    "name": "channel-test",
                    "description": "channel for : " + testName,
                    "endpoint": `${floret.url}/${testName}`,
                    "serviceName": floret.name,
                    "hostURL": floret.host,
                    "hostPort": floret.port,
                    "uri": "/events/" + testName
                }, handlerFn
            );

            await floret.addChannel(testChannel);
            channel = floret.channels[testName];

            let subCallback = sinon.stub();
            // create a subscriber
            let res = await
                request
                    .post(floret.baseURI + '/subscribe')
                    .send({ name: 'testSubscriber', url: floret.baseURI + '/test', channel: "channel-test" })


            let key = JSON.parse(res.text).name;
        });

        it('should initialize all channels', () =>{

        });

        it('should initialize a single channel', () =>{

        });

        it('should add man channels', () =>{

        });

        it('should add a single channel', async () =>{
            let testName = "channel-test2";
            let newChan = new floret.Channel(
                {
                    "name": testName,
                    "description": "channel for : " + testName,
                    "endpoint": `${floret.url}/${testName}`,
                    "serviceName": floret.name,
                    "hostURL": floret.host,
                    "hostPort": floret.url,
                    "uri": "/events/" + testName
                }
            )
            let res = await floret.addChannel(newChan);
            channel = floret.channels[testName];

            assert.isObject(channel);
        });

        it('should get the channels spec', () => {
            assert.isObject(floret.channels["channel-test"].config());
        });


        it('should broadcast', async () => {
            let script = new floret.Subscription('testScript', floret.service, floret.router, floret.gateway);
            let ob = () => {
                console.log('*************** received')
            };
            await script.init();
            await script.observable.subscribe(ob);
            await script.observable.next('cool');
            let spy = sinon.stub(floret.channels['channel-test'], 'handler').callsFake( () => {

            });

            await floret.channels['channel-test'].broadcast('unit-test-floret', {"foo": "Bar"});

    });

        it('should update a channel', () =>{

        });

        it('should delete a channel', () =>{


        });

        it('should get all channels', () =>{

        });

        it('should set all channels', () =>{

        });

        it('should discover channels at gateway', () =>{

        });

        it('should create channel api at gateway', () =>{

        });

        it('should delete channel at gateway', () =>{

        });
    });

    describe('Subscriptions', () => {
        let script, observer;
        before(()=> {
            script = new floret.Subscription('testScript', floret.service, floret.router, floret.gateway);
            observer = sinon.stub();
            script.observable.subscribe(observer);
        });

        it('should initialize subscriptions', async () =>{
            let res = await expect(async () => {
                return await script.init();
            }).to.not.throw();

            assert.isObject(res);
        });


        it('should create a subscription api', () => {
            expect(async () => await script.createSubscriptionAPI()).to.not.throw();
        });

        it('should return subscription url', () => {
            assert
                .isString(script.subscriptionURL);
            console.log('script.subscriptionURL ' + script.subscriptionURL)



        });

        it('should have a setter for observable', async () => {
            let subject = new Rx.Subject();
            // set a new observable
            script.observable = subject;

            // wrapped in promise, wait until fired to test
            let sub = await script.observable.subscribe((msg) => {
                expect(msg).to.equal('test');
            });

            // invoke
            script.observable.next('test');
            sub.unsubscribe();
        });

        it('should have a setter for endpoint', () => {
            let oldEndpoint = script.endpoint;
            script.endpoint = "http://127.0.0.1:8096/unit-test-floret/subscription/new";
            assert(script.endpoint !== oldEndpoint);
        });

        it('should have a setter for uri', () =>{
            console.log('original script uri ' + script.uri)
            let oldUri = script.uri;
            script.uri = "/unit-test-floret/subscription/newUri";
            assert(script.uri !== oldUri);
        });

        it('should have a setter for name', () =>{
            let oldName = script.name;
            script.name = 'newName';
            assert(script.name !== oldName);
        });

        it('should create new subscription endpoints', async () =>{
            script.uri = '/subscription/foo';
            // create a new endpoint, and listen for messages
            await script.createSubscriptionEndpoint();

            let onIncoming = (msg) => {
                console.log('Sub observed change')
                assert.isObject(msg);
                return msg;
            };

            let sub = script.observable.subscribe(onIncoming);
            let pkg = new floret.Package('bar', 'foo', 'channel-test', {"testFor": "foo"});

            let res = await request
                .post(floret.baseURI + script.uri)
                .send(pkg.toJSON())
                .expect(200);
            sub.unsubscribe();

        });

        it('should return a gateway', () =>{
            assert.isObject(script.gateway);
        });

        it('should return a service', () =>{
            assert.isObject(script.service);
        });

        it('should return a router', () =>{
            assert.isObject(script.router);
        });

        it('should return Subscription class', () =>{
            let Subscription = floret.Subscription;
            let subscription = new Subscription('foo', floret.service, floret.router, floret.gateway);
            assert.instanceOf(subscription, Subscription);
        });
    });

    describe('Subscribers', () => {

            let sub, subKey, Sub;
            before(async () => {
                // create a new channel
                let testName = "subscriber-test";
                testChannel = new floret.Channel(
                    {
                        "name": testName,
                        "description": "channel for : " + testName,
                        "endpoint": `${floret.url}/${testName}`,
                        "serviceName": floret.name,
                        "hostURL": floret.host,
                        "hostPort": floret.port,
                        "uri": "/events/" + testName
                    }
                );

                console.log('adding new id channel')
                await floret.addChannel(testChannel);
                channel = floret.channels[testName];

                let res = await
                    request
                        .post(floret.baseURI + '/subscribe')
                        .send({ name: 'testSubscriber', url: floret.baseURI + '/test', channel: "channel-test" })


                subKey = JSON.parse(res.text).name;
                sub = floret.channels['channel-test'].subscribers[subKey];
        });

        it('should return Subscriber class', () =>{
            let subClass = floret.Subscriber;
            let newSub = new subClass('classTest', floret.baseURI + '/test');
            assert.instanceOf(newSub, subClass);
        });

        it('should have an observer' , () => {
            assert.isObject(sub.observer);
            assert.isFalse(sub.observer.closed)
        });

        it('should have an observer' , () => {
            assert.isObject(sub.observer);
        });

        it('should have a name' , () => {
            assert.isString(sub.name);
        });

        it('should have an endpoint' , () => {
            assert.isString(sub.endpoint);
        });

        it('should throw an error if not supplied enough arguments', () => {
            expect(() => {
                let newSub = new floret.Subscriber();
            }).to.throw();
        });

        it('should have a name setter', () =>{
            sub.name = 'newName';
            assert(floret.channels['channel-test'].subscribers[subKey].name === 'newName');
        });

        it('should have an endpoint setter', () => {
            sub.endpoint = 'http://new.ep';
            assert(floret.channels['channel-test'].subscribers[subKey].endpoint === 'http://new.ep');
        });

        it('should unsubscribe observer', () =>{
            sub.unsubscribe();
            assert.isTrue(sub.observer.closed)
        });
    });

    describe('Gateway', () => {
        let gw, gwSpy, rpSpy, rpStub;
        let rp = require('request-promise');
        before (async () => {
            floretConfig = {
                "name": serviceName,
                "port": servicePort,
                "uri": serviceURI,
                "host": serviceHost,
                "environments": {
                    "local":
                        {
                            "gatewayHost":
                            gatewayHost,
                            "gatewayProxyPort":
                            gatewayProxyPort,
                            "gatewayAdminPort":
                            gatewayAdminPort,
                        }
                },
                "publishDocs": true
            };

            let newConfig = new floret.Config(floretConfig);
            //floret = new Floret();
            floret.configure(newConfig);
            gw = floret.gateway;
            //require('./gateway.stubs')(sinon, floret);

        });

        beforeEach(() => {
            gwSpy = sinon.spy(gw, 'send');
        });
        afterEach(() => {
            gwSpy.restore();
        });

        it('should send http get requests',async () => {
            let res = await gw.send({"uri": "foo.cool.bar"});
            assert(gwSpy.callCount === 1);
        });

        it('should send http post requests', async () => {
            let res = await gw.send({"uri": "foo.cool.bar", "method": "post"});
            assert(gwSpy.callCount === 1);
        });

        it('should send http delete requests', async () => {
            let res = await gw.send({"uri": "foo.cool.bar", "method": "del"});
            assert(gwSpy.callCount === 1);
        });

        it('should send http put requests', async () => {
            let res = await gw.send({"uri": "foo.cool.bar", "method": "put"});
            assert(gwSpy.callCount === 1);
        });

        it('should send http patch requests', async () => {
            let res = await gw.send({"uri": "foo.cool.bar", "method": "patch"});
            assert(gwSpy.callCount === 1);
        });
        /*
        it('should suppress 409 errors', async () => {
            rpGetStub.rejects({"statusCode": 409})
            let spy = sinon.spy(gw, 'suppress409');
            let res = await gw.send({"uri": "foo.bar", "method": "get"})
            expect(spy).to.not.throw();
            spy.restore();
        });

        it('should raise non 409 errors', async () => {
            rpGetStub.rejects(401);
            let spy = sinon.spy(gw, 'suppress409');

            try {
               await gw.send({"uri": "foo.bar", "method": "get"}).then( () => {
                   assert(spy.callCount === 1);
               })

            } catch(e){console.log(e)};
        })
        */
    });

    describe('Package', () => {
        let pkg;
        before(()=> {
           let config = {
               sender: 'tester',
               receiver: 'foo',
               channel: 'channel-test',
               payload: {'foo': 'bar'}
           };

           pkg = new floret.Package(config);
        });

        it('should return a sender', ()=>{
            assert.isString(pkg.sender);
        });

        it('should set a sender', () => {
            let old = pkg.sender;
            pkg.sender = 'tester-2';
            assert(old !== pkg.sender);
        });

        it('should return a receiver', ()=>{
            assert.isString(pkg.receiver);
        });

        it('should set a receiver', () => {
            let old = pkg.receiver;
            pkg.receiver = 'baz';
            assert(old !== pkg.receiver);
        });

        it('should return a channel', ()=>{
            assert.isString(pkg.channel);
        });

        it('should set a channel', () => {
            let old = pkg.channel;
            pkg.channel = 'channel-2';
            assert(old !== pkg.channel);
        });

        it('should return a payload', ()=>{
            assert.isObject(pkg.payload);
        });

        it('should set a payload', () => {
            let old = Object.create(pkg.payload);
            pkg.payload = {'baz': 'payload-2'};
            assert(old !== pkg.payload);
        });
    });

    describe('Service', () => {
        let service;
        before(() => {
           service = floret.service;
        });

        it('should return a port ', ()=> {
            assert.isNumber(service.port);
        });

        it('should set a port', () => {
            let op = service.port;
            service.port = 1234;
            assert(op !== service.port);
        });

        it('should return a name', ()=> {
            assert.isString(service.name);
        });

        it('should set a name', ()=> {
            let oldName = service.name;
            service.name = 'newName';
            assert(oldName !== service.name)
        });

        it('should return a host', ()=> {
            assert.isString(service.host);
        });

        it('should set a host', ()=> {
            let oldHost = service.host;
            service.host = 'http://new.com';
            assert(oldHost !== service.host)
        });

        it('should return a proxyURI', ()=> {
            assert.isString(service.proxyURI);
        });

        it('should set a proxyURI', ()=> {
            let oldURI = service.proxyURI;
            service.proxyURI = 'newName';
            assert(oldURI !== service.proxyURI)
        })

    });
});