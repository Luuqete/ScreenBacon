//import { delay } from "lodash";
const os = require('os');
const dgram = require('dgram');
import { Protocol } from "./protocol";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { app } from "electron";

function getDeviceId(): string {
    const file = path.join(app.getPath("userData"), "device-id");

    if (fs.existsSync(file)) {
        return fs.readFileSync(file, "utf8").trim();
    }

    const id = crypto.randomUUID();

    fs.writeFileSync(file, id);

    return id;
}

class ScreenBacon {
    private port: string | null = null;
    private id: string | null = null;
    private udp: boolean = true;
    private interfaces: Map<string, {ip:string,brodcast:string}> | null = null;
    private static instance: ScreenBacon | null = null;
    constructor() {
        this.interfaces = new Map<string, {ip:string,brodcast:string}>();
        this.loadNetworkInterfaces();
    }

    public setPort(port: string) {
        this.port = port;
    }

    public setId(id: string) {
        this.id = id;
        console.log("ID setted 2");
    }

    public async sendUDP() {
        this.udp = true;
        console.log("SUPONESE QUE EMPEZARÍA LA UDP OOOOOOOOOOAAAAAAAA NDEAH TIRABA ESA ");

        const protocol: Protocol = { ip: "", port: this.port!, sessionId: this.id!, deviceId: getDeviceId(), version: "0.1.0" }

        const client = dgram.createSocket('udp4');       

        client.bind(0, () => {
            client.setBroadcast(true);
            this.sendLoop(client, protocol);
            console.log("Socket UDP listo");

        });
    }

    private async sendLoop(
        client,
        protocol,
    ) {
        while (this.udp) {

            for (const [name, {ip,brodcast}] of this.interfaces!) {
                try {
                    const message = Buffer.from(JSON.stringify({ ...protocol, ip:ip }));
                    
                    console.log(`MANDANDO UDP POR EL BRODCAST ${brodcast} (HACÉ DE CUENTA QUE SE MANDA)`);
                    console.log(`http://${ip}:${this.port}/${this.id}`);
                    
                    client.send(message, 9547, brodcast, (err) => {
                        if (err) {
                            console.error("UDP error:", err);
                        } else {
                            console.log("Message sent");
                        }
                    });
                    
                    console.log(`${message}`);
                } catch (error) {
                    this.interfaces?.delete(name);
                    console.log(`INterface ${name} deleted, error ${error}`);
                }
            }

            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        client.close()
    }

    public async onConnected() {
        this.udp = false;
    }

    public static getInstance(): ScreenBacon {
        if (ScreenBacon.instance == null) {
            console.log("Inicializando ScreenBacon (Maybe un singelton no fué la mejor idea he de admitir)")
            ScreenBacon.instance = new ScreenBacon()
        }
        return ScreenBacon.instance;
    }

    private loadNetworkInterfaces() {
        const networkInterfaces = os.networkInterfaces();
        for (const name of Object.keys(networkInterfaces)) {
            for (const iface of networkInterfaces[name]) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    this.interfaces?.set(name, {ip:iface.address, brodcast:this.getBroadcastAddress(iface.address, iface.netmask)});
                }
            }
        }
    }

    private getBroadcastAddress(ipAddress, netmask): string {

        const ipParts = ipAddress.split('.').map(Number);
        const maskParts = netmask.split('.').map(Number);

        // Calculate broadcast by ORing IP with inverted mask
        const broadcastParts = ipParts.map((b, i) => (b | (~maskParts[i] & 0xff)));

        return broadcastParts.join('.');
    }
}

export function setPort(port: string) {
    console.log(`Port setted ${port}`);
    ScreenBacon.getInstance().setPort(port);
}

export function setID(id: string) {
    console.log(`ID setted ${id}`);
    ScreenBacon.getInstance().setId(id);
    ScreenBacon.getInstance().sendUDP();
}

export function onConnected() {
    console.log("On Connected Called");
    ScreenBacon.getInstance().onConnected();
}
