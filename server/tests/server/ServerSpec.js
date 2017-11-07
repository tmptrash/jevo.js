describe("server/src/server/Server", () => {
    const WebSocket    = require('ws');
    const Config       = require('./../../../client/src/global/Config').Config;
    const Observer     = require('./../../../common/src/global/Observer');
    const Server       = require('./../../../server/src/server/Server').Server;
    const OLD_MODE     = Config.modeNodeJs;
    Config.modeNodeJs  = true;
    const Client       = require('./../../../client/src/manager/plugins/client/Client').Client;
    const SEVENTS      = require('./../../../server/src/server/Server').EVENTS;
    const CEVENTS      = require('./../../../client/src/manager/plugins/client/Client').EVENTS;
    const EVENT_AMOUNT = require('./../../../client/src/global/Events').EVENT_AMOUNT;
    const SConsole     = require('./../../../server/src/global/Console');
    const Console      = require('./../../../client/src/global/Console');
    const Helper       = require('./../../../common/tests/Helper');
    const TYPES        = require('./../../../common/src/global/Requests').TYPES;
    const Api          = require('./../../src/server/plugins/Api');
    const Request      = require('./../../../common/src/net/plugins/Request');
    const waitEvent    = Helper.waitEvent;

    const PLUGINS = {
        Request,
        Api
    };
    const CLIENT_URL = `ws://127.0.0.1:${Config.port}`;

    let error;
    let warn;
    let info;
    let serror;
    let swarn;
    let sinfo;

    beforeAll(() => {
        error = Console.error;
        warn  = Console.warn;
        info  = Console.info;
        Console.error = () => {};
        Console.warn  = () => {};
        Console.info  = () => {};

        serror  = SConsole.error;
        swarn   = SConsole.warn;
        sinfo   = SConsole.info;
        SConsole.error = () => {};
        SConsole.warn  = () => {};
        SConsole.info  = () => {};
    });
    afterAll(()  => {
        SConsole.error = serror;
        SConsole.warn  = swarn;
        SConsole.info  = sinfo;

        Console.error = error;
        Console.warn  = warn;
        Console.info  = info;
        Config.modeNodeJs = OLD_MODE;
    });

    it("Checking server creation", () => {
        let server = new Server(Config.port, PLUGINS);

        server.destroy();
    });
    it("Checking many servers creation", () => {
        let server;

        for (let i = 0; i < 100; i++) {
            server = new Server(Config.port, PLUGINS);
            server.destroy();
        }
    });
    it("Checking two servers creation on different ports", () => {
        let server1 = new Server(Config.port, PLUGINS);
        let server2 = new Server(Config.port + 1, PLUGINS);

        server2.destroy();
        server1.destroy();
    });
    it("Checking two servers creation on the same port", () => {
        let server1 = new Server(Config.port, PLUGINS);
        let server2 = new Server(Config.port, PLUGINS);

        server2.destroy();
        server1.destroy();
    });
    it("Checking stopping of created server", () => {
        let server = new Server(Config.port, PLUGINS);
        expect(server.stop()).toBe(false);
        server.destroy();
    });
    it("Checking many times stopping of created server", () => {
        let server = new Server(Config.port, PLUGINS);
        for (let i = 0; i < 1000; i++) {
            expect(server.stop()).toBe(false);
        }
        server.destroy();
    });

    it("Checking two servers running on the same port", (done) => {
        let server1 = new Server(Config.port, PLUGINS);
        let server2 = new Server(Config.port, PLUGINS);

        waitEvent(server1, SEVENTS.RUN, () => server1.run() && server2.run, () => {
            waitEvent(server1, SEVENTS.DESTROY, () => {server2.destroy(); server1.destroy()}, done);
        });
    });
    it("Checking two servers running on different ports", (done) => {
        let server1 = new Server(Config.port, PLUGINS);
        let server2 = new Server(Config.port + 1, PLUGINS);
        let waitObj = {done: false};
        let times   = 0;

        expect(server1.run()).toEqual(true);
        expect(server2.run()).toEqual(true);
        server1.on(SEVENTS.RUN, () => {if (++times === 2) {waitObj.done = true}});
        server1.on(SEVENTS.RUN, () => {if (++times === 2) {waitObj.done = true}});
        Helper.wait(waitObj, () => {
            times = 0;
            server2.destroy();
            server1.destroy();
            server1.on(SEVENTS.STOP, () => {if (++times === 2) {waitObj.done = true}});
            server2.on(SEVENTS.STOP, () => {if (++times === 2) {waitObj.done = true}});
            Helper.wait(waitObj, done);
        });
    });

    it("Checking many times running/stopping of created server", (done) => {
        let server  = new Server(Config.port, PLUGINS);
        let waitObj = {done: false};

        for (let i = 0; i < 100; i++) {
            server.run();
            server.stop();
        }
        server.on(SEVENTS.DESTROY, () => waitObj.done = true);
        server.destroy();
        Helper.wait(waitObj, done);
    });
    it("Checking server running many times", (done) => {
        let server  = new Server(Config.port, PLUGINS);
        let waitObj = {done: false};

        for (let i = 0; i < 100; i++) {server.run()}
        server.on(SEVENTS.DESTROY, () => waitObj.done = true);
        server.destroy();
        if (waitObj.done) {done()}
        else {Helper.wait(waitObj, done)}
    });
    it("Checking server run", (done) => {
        let server  = new Server(Config.port, PLUGINS);
        let waitObj = {done: false};

        server.on(SEVENTS.RUN, () => waitObj.done = true);
        expect(server.run()).toEqual(true);
        Helper.wait(waitObj, () => {
            server.on(SEVENTS.DESTROY, () => waitObj.done = true);
            server.destroy(); // stop+destroy
            Helper.wait(waitObj, done);
        });
    });
    it("Checking server run/stop/run/stop", (done) => {
        let server  = new Server(Config.port, PLUGINS);
        let waitObj = {done: false};

        server.on(SEVENTS.RUN, () => waitObj.done = true);
        expect(server.run()).toEqual(true);
        Helper.wait(waitObj, () => {
            server.on(SEVENTS.STOP, () => waitObj.done = true);
            server.on(SEVENTS.RUN,  () => waitObj.done = true);
            server.stop();
            Helper.wait(waitObj, () => {
                expect(server.run()).toEqual(true);
                Helper.wait(waitObj, () => {
                    server.stop();
                    Helper.wait(waitObj, () => {
                        server.destroy();
                        done();
                    });
                });
            });
        });
    });

    it("Checking server run + one client connection", (done) => {
        let server  = new Server(Config.port, PLUGINS);
        let waitObj = {done: false};

        server.on(SEVENTS.CONNECT, () => waitObj.done = true);
        expect(server.run()).toEqual(true);
        const ws = new WebSocket(CLIENT_URL);
        Helper.wait(waitObj, () => {
            server.on(SEVENTS.STOP, () => waitObj.done = true);
            server.stop();
            Helper.wait(waitObj, () => {
                server.destroy();
                done();
            });
        });
    });
    it("Checking server run + two clients connection", (done) => {
        let server  = new Server(Config.port, PLUGINS);
        let waitObj = {done: false};
        let cons    = 0;

        server.on(SEVENTS.CONNECT, () => {if (++cons === 2) {waitObj.done = true}});
        expect(server.run()).toEqual(true);
        const ws1 = new WebSocket(CLIENT_URL);
        const ws2 = new WebSocket(CLIENT_URL);
        Helper.wait(waitObj, () => {
            server.on(SEVENTS.STOP, () => waitObj.done = true);
            server.stop();
            Helper.wait(waitObj, () => {
                server.destroy();
                done();
            });
        });
    });
    it("Checking server run + two clients and one disconnected", (done) => {
        let server  = new Server(Config.port, PLUGINS);
        let waitObj = {done: false};
        let cons    = 0;

        server.on(SEVENTS.CONNECT, () => {if (++cons === 2) {waitObj.done = true}});
        expect(server.run()).toEqual(true);
        const ws1 = new WebSocket(CLIENT_URL);
        const ws2 = new WebSocket(CLIENT_URL);
        Helper.wait(waitObj, () => {
            server.on(SEVENTS.CLOSE, () => waitObj.done = true);
            ws2.close();
            Helper.wait(waitObj, () => {
                server.on(SEVENTS.STOP, () => waitObj.done = true);
                server.stop();
                Helper.wait(waitObj, () => {
                    server.destroy();
                    done();
                });
            })
        });
    });
    it("Checking server run + one client connect/disconnect/connect", (done) => {
        let server = new Server(Config.port, PLUGINS);
        let client;

        waitEvent(server, CEVENTS.OPEN, () => {server.run(); client = new WebSocket(CLIENT_URL)}, () => {
            waitEvent(server, SEVENTS.CLOSE, () => client.close(), () => {
                waitEvent(server, CEVENTS.OPEN, () => client = new WebSocket(CLIENT_URL), () => {
                    waitEvent(server, SEVENTS.DESTROY, () => server.destroy(), done);
                });
            });
        });
    });

    it("Checking 'active' field", (done) => {
        let server  = new Server(Config.port, PLUGINS);
        let waitObj = {done: false};

        expect(server.active).toEqual(false);
        server.on(SEVENTS.CONNECT, () => waitObj.done = true);
        expect(server.run()).toEqual(true);
        const ws = new WebSocket(CLIENT_URL);
        Helper.wait(waitObj, () => {
            expect(server.active).toEqual(true);
            server.on(SEVENTS.STOP, () => waitObj.done = true);
            server.destroy();
            Helper.wait(waitObj, () => {
                expect(server.active).toEqual(false);
                done();
            });
        });
    });

    it("Checking that extra client should be disconnected", (done) => {
        class Man extends Observer {
            constructor() {
                super(EVENT_AMOUNT);
                this.activeAround = [false,false,false,false];
                this.clientId = null;
            }
            run()           {}
            setClientId(id) {this.clientId = id}
        }
        let man     = new Man();
        let man1    = new Man();
        let maxCon  = Config.maxConnections;
        Config.maxConnections = 1;
        let server  = new Server(Config.port, PLUGINS);
        let client  = new Client(man);

        client.run();
        waitEvent(client, CEVENTS.GET_ID, () => server.run(), () => {
            let client1 = new Client(man1);
            client1.run();
            waitEvent(client1, CEVENTS.CLOSE, () => {
                waitEvent(server, SEVENTS.DESTROY, () => server.destroy(), () => {
                    Config.maxConnections = maxCon;
                    man.clear();
                    man1.clear();
                    done();
                });
            });
        });
    });
});