
let FloretConfig;

{
    let _config = Symbol('config');

    FloretConfig = class FloretConfig {

        /**
         *
         * @param configObj
         * @param name
         * @param host
         * @param port
         * @param uri
         * @param gatewayHost
         * @param gatewayAdminPort
         * @param gatewayProxyPort
         */
        constructor(configObj, ...[name, host, port, uri, gatewayHost, gatewayAdminPort, gatewayProxyPort, disconnected]) {
            this[_config] = {};
            this[_config].name = name ? name : configObj.name;
            this[_config].host = host ? host : configObj.host;
            this[_config].port = port ? port : configObj.port;
            this[_config].uri = uri ? uri : configObj.uri;
            this[_config].gatewayHost = gatewayHost ? gatewayHost : configObj.gatewayHost;
            this[_config].gatewayAdminPort = gatewayAdminPort ? gatewayAdminPort : configObj.gatewayAdminPort;
            this[_config].gatewayProxyPort = gatewayProxyPort ? gatewayProxyPort : configObj.gatewayProxyPort;
            this[_config].endpoint = `${this[_config].host}:${this[_config].port}/${this[_config].name}`;
            this[_config].documentationPaths = configObj.documentationPaths;
            this[_config].disconnected = disconnected ? disconnected : configObj.disconnected;

            this[_config].channels = configObj.channels ? configObj.channels : [];
            this[_config].subscriptions = configObj.subscriptions ? configObj.subscriptions : [];
            this[_config].apis = configObj.apis ? configObj.apis : [];
            this[_config].publishDocs = configObj.publishDocs === false ? false : true;
            this[_config].logging = configObj.logging === true ? true : false;

            this[_config].root = configObj.root;
        }

        /**
         *
         * @returns {*}
         */
        get params() {
            return this[_config];
        }

        get name () {
            return this[_config].name;
        }

        get host () {
            return this[_config].host;
        }

        get uri () {
            return this[_config].uri;
        }

        get gatewayHost () {
            return this[_config].gatewayHost;
        }

        get gatewayAdminPort () {
            return this[_config].gatewayAdminPort;
        }

        get gatewayProxyPort () {
            return this[_config].gatewayProxyPort;
        }

        get endpoint () {
            return this[_config].endpoint;
        }

        get documentationPaths () {
            return this[_config].documentationPaths;
        }

    }
}

module.exports = FloretConfig;