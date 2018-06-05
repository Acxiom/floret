# Getting Started with Floret

## Prerequisites

### Runtime Environment
Floret is a node module.  It runs in containerized nodejs environments.

### Docker
Start by [installing Docker](https://docs.docker.com/engine/installation/).  You'll be deploying your Floret services in containers.

### Kong API Gateway
Download and build the kong + postgres containers.  Instructions [here](https://hub.docker.com/_/kong/)

You should now have kong api gateway running.  Kong exposes 2 apis.  
* Admin API - default port 8001.  administrative tasks such as managing registered apis, applying plugins to api sets, etc.
* Proxy API - default port 8000.  The floret services endpoints are accessible through this port.  ex http://my-kong:8000/my-registered-service

Verify your installation:

    curl -i -H "Accept: application/json" -H "Content-Type: application/json" -X GET http://localhost:8001/apis

    HTTP/1.1 200 OK
    Date: Fri, 20 Oct 2017 14:37:24 GMT
    Content-Type: application/json; charset=utf-8
    Transfer-Encoding: chunked
    Connection: keep-alive
    Access-Control-Allow-Origin: *
    Server: kong/0.10.3


### NodeJS
Floret runs on node v8.4+.  See the example-Dockerfile in the root directory.  At the  time of this writing, alpine-node
8.7 is the recommended node image.  See the [docker page](https://hub.docker.com/r/mhart/alpine-node/) for more details.

## Building a Floret Service

###  Configuring a floret service
The basic floret configuration object looks like this.  Typically you'll store this in a configuration file.  This object is passed to the floret contructor.

    {
        "gatewayHost": "http://127.0.0.1",
        "gatewayProxyPort": 8000,
        "gatewayAdminPort": 8001,
        "serviceName": "fooFloretService",
        "serviceHost": "http://10.28.200.129",
        "servicePort": 8087,
        "serviceURI": "/foo-floret"
    }








