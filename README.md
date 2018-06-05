![Event Flow](images/floret-logo.png) *floret - Noun: one of the small flowers making up a composite flower head.*
# Floret Microservices
## Overview
###  A microservice framework for node

Floret.js is a lightweight microservice framework for event driven applications.  
Floret provides a microservice core that handles the complexity of event-driven  
communcation between services. 

### Rapid service development
Enjoy standing up microservices in minutes. With just a few lines of code your service
will:

* self-register with an api gateway
* create healthcheck and new subscriber apis at the gateway and web server
* generate an Open API spec
* create an api for managing pub/sub operations
* discover channels and their subscribers
* discover subscriptions to other floret services

### Architectural Requirements
Refer [here](#architecture-overview) to understand floret's microservice architecture.

## Installation 

### Prerequisites

Floret requires __node v8.x__ or higher.

Floret microservice require Kong API gateway.  [See here](#kong-install) for container-based deployment instructions.

```
$ npm install floret
```

# Getting Started by Example

## Hello Floret (stand-alone service)
Simple example of a stand-alone service using floret.
### Greetings Service
#### index.js
```js
{
    const Floret = require('floret');
    const app = new Floret();
    app.configure(app.createEnvConfig(process.env));
    
    app.listen();
}
```

#### api/hello.js
```js
module.exports = (app) => {
    app.router.get('/hello/:name', (ctx, next) => {
        ctx.response.body ={
          "greeting":  `hello ${ctx.params.name}`
        }
    });
};

```
#### floret.json
```js
{
  "name": "greetings",
  "uri": "/greetings",
  "port": 8088,
  "disconnected": true,
  "apis": [
    {
      "name": "hello",
      "uri": "/hello",
      "methods": [
        "GET"
      ],
      "path": "/api/hello"
    }
  ],
  "channels": [],
  "subscriptions": []
}
```
#### package.json
```
{
  "name": "greetings",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "author": "",
  "license": "ISC",
  "dependencies": {
    "floret": "file:///Users/clibro/work/project/floret/repos/floret"
  }
}
```
### Install Dependencies
```
npm install
```
### Start service
```
$ node index

Configuration complete.
Initializing greetings:
...routes prefixed [/greetings]
...complete.
Listening on port 8088
```
### Request 

```
curl -i -H "Accept: application/json" -H "Content-Type: application/json" -X GET http://127.0.0.1:8000/hello/world
```

```
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 26
Date: Thu, 31 May 2018 20:40:31 GMT
Connection: keep-alive

{"greeting":"hello world"}
```


## Hello *Static* Universe (floret microservices)

### Service: earth 

#### Structure
````
earth/
    api/
        greet.js
    floret.json
    index.js
    package.json

````
#### floret.json
````
{
    "name": "earth",
    "uri": "/earth",
    "port": 8887,
    "apis": [
        {
          "name": "greet-api",
          "uri": "/greet",
          "methods": [
            "POST"
          ],
          "path": "/api/greet"
        }
    ],
    "channels": [
      {
        "name": "earth-greeting",
        "uri": "/greet",
        "description": "a channel"
      }
    ],
    "subscriptions": []
}
````
#### index.js
````
{
    const Floret = require('floret');
    const app = new Floret();
    app.configure(app.createEnvConfig(process.env));

    app.listen();
}
````
#### api/greet.js
````
module.exports = (app) => {
    app.router.post('/greet/:name', async (ctx, next) => {
        app.channels['earth-greeting'].broadcast({
            "greeting":  `hello ${ctx.params.name}! Yours Truly - ${app.name}`
        }, app.name, ctx.body.trackingId)
    });
};
````

### Service: mars 

#### Structure
````
mars/
    api/
        greet.js
    floret.json
    index.js
    package.json

````
#### floret.json
````
{
  "name": "mars",
  "uri": "/mars",
  "port": 8886,
  "apis": [
    {
      "name": "greet-api",
      "uri": "/greet",
      "methods": [
        "POST"
      ],
      "path": "/api/greet"
    }
  ],
  "channels": [
    {
      "name": "mars-greeting",
      "uri": "/greet",
      "description": "introductions"
    }
  ],
  "subscriptions": []
}
````
#### index.js
````
{
    const Floret = require('floret');
    const app = new Floret();
    app.configure(app.createEnvConfig(process.env));

    app.listen();
}
````
#### api/greet.js
````
module.exports = (app) => {
    app.router.post('/greet/:name', async (ctx, next) => {
        app.channels['mars-greeting'].broadcast({
            "greeting":  `Greetings ${ctx.params.name}, ${app.name}`
        }, app.name, ctx.body.trackingId)
    });
};
````
### Service: universe 

#### Structure
````
universe/
    api/
        hello.js
    subs/
        common.js
    floret.json
    index.js
    package.json

````
#### floret.json
````
{
    "name": "universe",
    "uri": "/universe",
    "port": 8888,
    "disconnected": false,
    "apis": [
        {
          "name": "hello",
          "uri": "/hello",
          "methods": [
            "GET"
          ],
          "path": "/api/hello"
        }
    ],
    "channels": [],
    "subscriptions": [
      {
        "name": "earth-sub",
        "service": "earth",
        "channel": "earth-greeting",
        "path": "/subs/common"
      },
      {
        "name": "mars-sub",
        "service": "mars",
        "channel": "mars-greeting",
        "path": "/subs/common"
      }
    ]
    
}

````
#### index.js
````
{
    const Floret = require('floret');
    const app = new Floret();

    // default handler for the configured subscriptions using floret module system
    app.attachModule('greetingHandler', (ctx) => {
        return new app.Package(ctx.request.body);
    } );

    app.configure(app.createEnvConfig(process.env));

    app.listen();
}

````
#### subs/common.js
````
module.exports = (app) => {
    return {
        // attach the default handler to the subscription
        onEvent: app.getModule('greetingHandler')
    }
};
````
#### api/hello.js
````
module.exports = (app) => {
    app.router.get('/hello-universe/:name', async (ctx, next) => {
        let name = ctx.params.name;
        let greetings = [];

        await new Promise(async (resolve, reject) => {
            let requests = [
                app.apiRequest('/earth/greet/' + name, 'POST', {}),
                app.apiRequest('/mars/greet/' + name, 'POST', {})
            ];

            // collect tracking id's so we can watch for them
            let trackingIds = await Promise.all(requests).then (resArr => {
                return resArr.reduce((obj, res) => {
                    obj[res.trackingId] = true;
                    return obj;
                }, {})
            });

            // create subscriptions
            if (app.subscriptions.length > 0) {
                for (let i = 0; i < app.subscriptions.length; i++) {
                    let ob = app.subscriptions[i].observable;
                    ob.subscribe((val) => {
                        let trackingId = val.request.body.trackingId;
                        if (trackingIds[trackingId]) {
                            delete trackingIds[trackingId];
                            greetings.push(val.request.body)
                            if (Object.keys(trackingIds).length === 0) {
                                resolve(greetings);
                            }
                        }
                    })
                }
            } else {
                reject('No subscriptions')
            }
        });

        ctx.response.body ={
          "greetings":  greetings
        }
    });
};
````

### Start services
```
// start each service with...
node index
```

### Request 
```
$ node index

Configuration complete.
Initializing greetings:
...routes prefixed [/greetings]
...complete.
Listening on port 8001
```
```
curl -i -H "Accept: application/json" -H "Content-Type: application/json" -X GET http://127.0.0.1:8000/universe/hello/human
```

```
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 26
Date: Thu, 31 May 2018 20:40:31 GMT
Connection: keep-alive

{
    "greetings": [
        {
            "sender": "mars",
            "payload": {
                "greeting": "Greetings human, mars"
            },
            "trackingId": "7c760987-75b3-4abe-85e3-a916bd80b4cc"
        },
        {
            "sender": "earth",
            "payload": {
                "greeting": "hello human! Yours Truly - earth"
            },
            "trackingId": "3f463625-0281-49b1-a3f3-2a2b8f18254f"
        }
    ]
}
```
## Hello *Dynamic* Universe (floret microservices)
In Progress...

# Appendix

## <a name="architecture-overview">Architecture</a>
### Core libraries
Floret is built upon [KOA](https://github.com/koajs/koa).  KOA provides the http middleware framework for writing web applications and apis.  
Floret uses reactive programming concepts to handle observable incoming events.  See [rxjs](http://reactivex.io/rxjs/) for more details.

### Floret Environment
Floret services are event driven, publishing and subscribing to event data via a central API Gateway.  The illustration  
below is an example of a floret.  Each floret service provide specific functionality.

![Ecosystem](images/floret-ecosystem-ex.png)


## <a name="kong-install">Installing Kong API Gateway</a>

Floret uses [Kong API Gateway](https://getkong.org/) CE version > 0.12.x

The recommended way to run your gateway is with docker containers.  
https://hub.docker.com/_/kong/

#### Example Run commands for Kong + Cassandra

#### postgres
```
docker run -d --name kong-database  \
    -p 5432:5432  \
    -e "POSTGRES_USER=kong"  \
    -e "POSTGRES_DB=kong"  \
    postgres
```    
#### kong
````
docker run -d --name kong \
     --link kong-database:kong-database \
     -e "KONG_DATABASE=postgres" \
     -e "KONG_PG_HOST=kong-database" \
     -e "KONG_PROXY_ACCESS_LOG=/dev/stdout" \
     -e "KONG_ADMIN_ACCESS_LOG=/dev/stdout" \
     -e "KONG_PROXY_ERROR_LOG=/dev/stderr" \
     -e "KONG_ADMIN_ERROR_LOG=/dev/stderr" \
     -e "KONG_ADMIN_LISTEN=0.0.0.0:8001" \
     -e "KONG_ADMIN_LISTEN_SSL=0.0.0.0:8444" \
     -p 8000:8000 \
     -p 8443:8443 \
     -p 8001:8001 \
     -p 7947:7946 \
     -p 7947:7946/udp \
     kong
````

#### Verifying installation
The default gateway api port is 8000.  The default gateway admin port is 8001.

Verify installation with this url
````
curl -i -H "Accept: application/json" -H "Content-Type: application/json" -X GET http://localhost:8001/status
````

````
HTTP/1.1 200 OK
Date: Tue, 05 Jun 2018 16:30:53 GMT
Content-Type: application/json; charset=utf-8
Transfer-Encoding: chunked
Connection: keep-alive
Access-Control-Allow-Origin: *
Server: kong/0.12.2

{"database":{"reachable":true},"server":{"connections_writing":1,"total_requests":1312,"connections_handled":1291,"connections_accepted":1291,"connections_reading":0,"connections_active":1,"connections_waiting":0}
````

## <a name="floret-basics">Basic Concepts</a>
#### Custom APIs
Add custom API endpoints to the built-in floret http server.

app/routes/routes.js
````
    module.exports = (app) => {
        app.router.get('/hello-world', async(ctx, next) => {
            ctx.body = "Hello World";
        });
        
        app.router.post('/hello-world', async(ctx, next) => {
            console.log('Incoming message to /hello-world');
            console.log(ctx.body);
        });
    }
    
    // index.js
    ...
    const floret = new Floret(floretConfig);
    ...
    // include any apis (routes) your web api will serve
    const routes = require('./app/routes/routes')(floret);
    
    floret.listen(() => {
        // make your api public by registering it at the gateway
        floret.registerAPI(`hello-world`, '/hello-world', 'GET,POST').then( (res) => {
            console.log('api hello-world created at the api gateway');
        })
    });
    
````

### Pub/Sub
Floret has a built-in pub/sub model for event-driven communication with other floret services.  
Publishers emit messages on subscribable channels.  A subscription to a channel in effect means 
that the published messages will be POSTed to the subscriber-provided api endpoint.

Subscriptions can be created dynamically after both the Publisher and Subscriber services are active.  

#### Channels
Messages are published to channels, and channels can be subscribed to.  Channels can be  
defined statically or dynamically.

##### Static Channel
````
    const soapboxConfig = {
        "name": "soapbox",
        "description": "a channel for rants",
        "hostURL": floretConfig.serviceHost,
        "hostPort": floretConfig.servicePort,
        "uri": "/soapbox"
    };
    
    ...
    let soapboxChannel = new floret.Channel(soapboxConfig);
    floret.channels = [soapboxChannel];
    floret.listen(()=>{});
    ...
````    
##### Dynamic Channel
````
    // create new channels under the /rooms/ uri
    floret.router.post('/rooms/:channel', async (ctx, next) => {
        let channelName = ctx.params.channel;
        let channel = app.channels[channelName];

        if (!channel){
            let newChannel = new floret.Channel({
                "name": room,
                "description": "general topics",
                "endpoint": `${floret.url}/rooms/${channel}`,
                "serviceName": floret.name,
                "hostURL": floret.host,
                "hostPort": floret.url,
                "uri": "/rooms/" + channelName
            });
            
            await app.addChannel(newChannel);
        }
    });

````
#### Subscriptions
Similar to a webhook, a subscription is the configured landing spot for incoming service messages.

##### Create a new subscription with multiple handlers
````    
    ...
    const floret = new Floret(floretConfig);
    
    // creates a new handler function    
    let fooHandler = (ctx) => {
        let pkg = new floret.Package(ctx.body);
        console.log('received message: ' + JSON.stringify(pkg.payload))
    });
    
    let barHandler = (ctx) => {
        let pkg = new floret.Package(ctx.body);
        console.log('received message: ' + JSON.stringify(pkg.payload))
    });
    
    // create a subscription object    
    let bazSubscription = new floret.Subscription('fooSubscription', floret.service, floret.router, floret.gateway);
    
    // attach 1 or more handler functions to the subscription event 
    bazSubscription.observable.subscribe(fooHandler);
    bazSubscription.observable.subscribe(barHandler);
    
    // add to array of subscriptions, which will be invoked during floret initialization
    floret.addSubscription(bazSubscription);
    ...
````
##### Subscribe to a Floret Service by name and channel
````
    ...
    floret.listen().then(() =>{
        // subscribe to a service once floret is up.  specify a subscription
        let subscriberId = floret.subscribe('baz', 'bazChannel', bazSubscription);
    })
````
##### Subscribe a Floret Service to another via the REST API
````
    POST http://api-gateway:8000/baz/subscribe/
    Content-Type application/json
    body:
    {
        "name": "example-service",
        "url": "http://192.168.1.158:8084/example-service/subscription/bazSubscription",
        "channel": "bazChannel"
    }
````  
##### Unsubscribe from a Floret Service 
````
    ...
    floret.unsubscribe('baz', 'bazChannel', subscriberId);
````    
##### Unsubscribe a Floret Service from another via the REST API
````
    POST http://api-gateway:8000/baz/unsubscribe/
    Content-Type application/json
    body:
    {
        "channelName": "baz",
        "url": "http://192.168.1.158:8084/example-service/subscription/bazSubscription",
        "channel": "bazChannel"
    }
````
#### Channel and Subscriber discovery process

When a floret service stands up, an immediate survey of the api gateway occurs.  It immediately discovers  
all of its channels registered at the gateway, and builds any it has not already created. When a new channel  
is created, subscribers of each channel are discovered.  They are attached and become observers of the channel.  

Self-discovery of channels and subscribers allows horizontal scaling of floret services that stand up and  
become aware of the services current state.    

### Documentation

Floret creates an Open API spec for your api at bootstrap.  It exposes a /api-spec.json resource, and this url can be
used by consuming applications.  One such application may be Swagger UI, which is deployed as a floret core service called
api-doc.  Upon standing up, a notification of new documentation is sent to api-doc, which in turn hosts the spec.

#### Documenting Custom APIs

If you added custom apis with your service, you'll want to document them in the Open API spec.  To do so, just add annotations
above your api like this:
````
    /**
     * @swagger
     * /test/it/out:
     *   get:
     *     description: test doc
     *     responses:
     *       200:
     *         description: bar bang
     *     tags: [pulse]
     */
    floret.router.get('/test/it/out', (ctx) => {
        console.log('test/it/out')
    })
````

Once your documentation is registered with floret api-doc service, it will appear in swagger ui.

![Swagger UI](images/swagger-ui.png)

## Authors
[clint brown - clint.brown.atx@gmail.com](mailto:clint.brown.atx@gmail.com) | [github - cbrown23](https://github.com/cbrown23)