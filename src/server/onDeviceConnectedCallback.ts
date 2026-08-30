import { IpcEvents } from '../common/IpcEvents.enum';
import { getDeskreenGlobal } from '../main/helpers/getDeskreenGlobal';
import { ScreenBaconApp } from '../main';
import { Device } from '../common/Device';
import SharingSessionStatusEnum from '../features/SharingSessionService/SharingSessionStatusEnum';

export function onDeviceConnectedCallback(device: Device): void {
	const ScreenBaconGlobal = getDeskreenGlobal();
	const { connectedDevicesService, sharingSessionService } = ScreenBaconGlobal;
	if (!connectedDevicesService.isSlotAvailable()) {
		const waitingSession =
			sharingSessionService.waitingForConnectionSharingSession;
		waitingSession?.denyConnectionForPartner();
		waitingSession?.setStatus(SharingSessionStatusEnum.NOT_CONNECTED);
		sharingSessionService.waitingForConnectionSharingSession = null;
		connectedDevicesService.resetPendingConnectionDevice();
		return;
	}
	connectedDevicesService.setPendingConnectionDevice(device);
	ScreenBaconApp.mainWindow?.webContents.send(
		IpcEvents.SetPendingConnectionDevice,
		device,
	);
}
