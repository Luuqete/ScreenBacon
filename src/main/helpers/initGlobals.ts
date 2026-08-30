import { app } from 'electron';
import { ConnectedDevicesService } from '../../features/ConnectedDevicesService';
import SharingSessionService from '../../features/SharingSessionService';
import RendererWebrtcHelpersService from '../../features/PeerConnectionHelperRendererService';
import RoomIDService from '../../server/RoomIDService';
import DesktopCapturerSources from '../../features/DesktopCapturerSourcesService';
import DesktopCapturerSourcesService from '../../features/DesktopCapturerSourcesService';

export interface ScreenBaconGlobal {
	appPath: string;
	rendererWebrtcHelpersService: RendererWebrtcHelpersService;
	roomIDService: RoomIDService;
	connectedDevicesService: ConnectedDevicesService;
	sharingSessionService: SharingSessionService;
	desktopCapturerSourcesService: DesktopCapturerSourcesService;
	latestAppVersion: string;
	currentAppVersion: string;
	cliLocalIp?: string;
}

export const initGlobals = (appPath: string, cliLocalIp?: string) => {
	const ScreenBaconGlobal: ScreenBaconGlobal = global as unknown as ScreenBaconGlobal;

	ScreenBaconGlobal.appPath = appPath;
	ScreenBaconGlobal.rendererWebrtcHelpersService =
		new RendererWebrtcHelpersService(appPath);
	ScreenBaconGlobal.roomIDService = new RoomIDService();
	ScreenBaconGlobal.connectedDevicesService = new ConnectedDevicesService();
	ScreenBaconGlobal.sharingSessionService = new SharingSessionService(
		ScreenBaconGlobal.roomIDService,
		ScreenBaconGlobal.connectedDevicesService,
		ScreenBaconGlobal.rendererWebrtcHelpersService,
	);
	ScreenBaconGlobal.desktopCapturerSourcesService = new DesktopCapturerSources();
	ScreenBaconGlobal.latestAppVersion = '';
	ScreenBaconGlobal.currentAppVersion = app.getVersion();
	ScreenBaconGlobal.cliLocalIp = cliLocalIp;
};
