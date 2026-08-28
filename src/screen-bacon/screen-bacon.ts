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
    private ip: string | null = null;
    private mask: string | null = null;
    private port: string | null = null;
    private id: string | null = null;
    private udp: boolean = true;
    private static instance: ScreenBacon | null = null;
    constructor() {
        this.ip = this.getIp();
        this.mask = this.getMask();
        console.log(`IP ${this.ip} MASK ${this.mask}`)
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
        let brodcast = this.getBroadcastAddress(this.ip, this.mask);
        console.log("SUPONESE QUE EMPEZARÍA LA UDP OOOOOOOOOOAAAAAAAA NDEAH TIRABA ESA ");

        const protocol:Protocol = {ip:this.ip!, port:this.port!, sessionId:this.id!,deviceId:getDeviceId(),version:"0.1.0"} 

        const client = dgram.createSocket('udp4');
        //const message = Buffer.from(`http://${this.ip}:${this.port}/${this.id}`);
        const message = Buffer.from(JSON.stringify(protocol));

        client.bind(0, () => {
            client.setBroadcast(true);
            this.sendLoop(client,message,brodcast);
            console.log("Socket UDP listo");
            
        });

        
    }

    private async sendLoop(
        client,
        message,
        brodcast
    ){
        while (this.udp) {
                client.send(message, 9547, brodcast, (err) => {
                    if (err) {
                        console.error("UDP error:", err);
                    } else {
                        console.log("Message sent");
                    }
                });
                console.log(`MANDANDO UDP POR EL BRODCAST ${brodcast} (HACÉ DE CUENTA QUE SE MANDA)`);
           // console.log(`http://${this.ip}:${this.port}/${this.id}`);
           console.log(`${message}`) 
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


    
    private getIp(): string {
        const networkInterfaces = os.networkInterfaces();
        let toRet = "";
        // Find first non-internal IPv4 address
        for (const name of Object.keys(networkInterfaces)) {
            for (const iface of networkInterfaces[name]) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    toRet = iface.address;
                    break;
                }
            }
        }
        return toRet;
    }

    private getMask(): string {
        const networkInterfaces = os.networkInterfaces();

        for (const name of Object.keys(networkInterfaces)) {
            const interfaces = networkInterfaces[name];
            if (!interfaces) continue;

            for (const iface of interfaces) {
                // Check for both 'IPv4' string and number 4 for Node version compatibility
                const isIPv4 = iface.family === 'IPv4' || (iface.family as unknown) === 4;

                if (isIPv4 && !iface.internal) {
                    return iface.netmask;
                }
            }
        }

        return "";
    }

    private getBroadcastAddress(ipAddress, netmask) {

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
