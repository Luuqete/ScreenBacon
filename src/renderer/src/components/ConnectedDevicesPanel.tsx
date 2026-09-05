import { useState,useEffect, useCallback } from 'react';
import { Button, Card, Text, H5, Alert, Intent } from '@blueprintjs/core';
import { Row, Col } from 'react-flexbox-grid';
import { useTranslation } from 'react-i18next';
import { IpcEvents } from '../../../common/IpcEvents.enum';
import { Device } from '../../../common/Device';



type DeviceWithDesktopCapturerSourceId = Device & {
	desktopCapturerSourceId: string;
};

export const ConnectedDevicesPanel= ({

}) => {
    const { t } = useTranslation();
    const [isAlertOpen, setIsAlertOpen] = useState(false);

		const [connectedDevices, setConnectedDevices] = useState<
		DeviceWithDesktopCapturerSourceId[]
	>([]);


	useEffect(() => {
		function getConnectedDevicesCallback() {
			window.electron.ipcRenderer
				.invoke(IpcEvents.GetConnectedDevices)
				.then(async (devices: Device[]) => {
					const devicesWithSourceIds: DeviceWithDesktopCapturerSourceId[] = [];

					for await (const device of devices) {
						const sharingSourceId = await window.electron.ipcRenderer.invoke(
							IpcEvents.GetDesktopCapturerSourceIdBySharingSessionId,
							device.sharingSessionID,
						);
						devicesWithSourceIds.push({
							...device,
							desktopCapturerSourceId: sharingSourceId,
						});
					}
					setConnectedDevices(devicesWithSourceIds);

					const map = new Map();
					devicesWithSourceIds.forEach((el) => {
						map.set(el.id, true);
					});
				})

				.catch((e) => console.error(e));
		}

		getConnectedDevicesCallback();

		const connectedDevicesInterval = setInterval(
			getConnectedDevicesCallback,
			4000,
		);

		return () => {
			clearInterval(connectedDevicesInterval);
		};
	}, []);

	const handleDisconnectOneDevice = useCallback(
		async (id: string) => {
			const device = connectedDevices.find((d: Device) => d.id === id);
			if (!device) return;
			await window.electron.ipcRenderer.invoke(
				IpcEvents.DisconnectPeerAndDestroySharingSessionBySessionID,
				device.sharingSessionID,
			);
			await window.electron.ipcRenderer.invoke(
				IpcEvents.DisconnectDeviceById,
				device.id,
			);
			setConnectedDevices(connectedDevices.filter((d: Device) => d.id !== id));
		},
		[connectedDevices, setConnectedDevices],
	);

    // Si no hay dispositivos, no mostramos el panel o mostramos un estado vacío sutil
    if (connectedDevices.length === 0) {
        return null;
    }

    return (
        <div
            style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: '#ffffff',
                borderTop: '1px solid #E1E8ED',
                boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
                padding: '12px 24px',
                zIndex: 100,
            }}
        >
            <Row between="xs" middle="xs" style={{ marginBottom: '8px' }}>
                <Col>
                    <Text className="bp3-text-muted" style={{ fontWeight: 600, fontSize: '12px' }}>
                        {t('connected-devices').toUpperCase()} ({connectedDevices.length})
                    </Text>
                </Col>
            </Row>

            <Row>
                <Col xs={12}>
                    {connectedDevices.map((device) => (
                        <Card
                            key={device.id}
                            elevation={0}
                            style={{
                                backgroundColor: '#F5F8FA',
                                border: '1px solid #E1E8ED',
                                borderRadius: '8px',
                                padding: '8px 16px',
                                marginBottom: '4px',
                            }}
                        >
                            <Row between="xs" middle="xs">
                                <Col>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <Text style={{ fontWeight: 600 }}>
                                            {device.deviceOS || 'Dispositivo'} - {device.deviceIP}
                                        </Text>
                                        <Text className="bp3-text-muted" style={{ fontSize: '11px' }}>
                                            {device.deviceBrowser || 'Browser / App'}
                                        </Text>
                                    </div>
                                </Col>
                                <Col>
                                    <Button
                                        intent={Intent.DANGER}
                                        icon="cross"
                                        style={{ borderRadius: '20px' }}
                                        onClick={() => handleDisconnectOneDevice(device.id)}
                                    >
                                        {t('disconnect')}
                                    </Button>
                                </Col>
                            </Row>
                        </Card>
                    ))}
                </Col>
            </Row>

            {/* Modal de confirmación para desconectar todos */}
            <Alert
                isOpen={isAlertOpen}
                onClose={() => setIsAlertOpen(false)}
                icon="warning-sign"
                intent={Intent.DANGER}
                confirmButtonText={t('disconnect-all-devices')}
                cancelButtonText={t('cancel')}
                onConfirm={() => {
                    
                    setIsAlertOpen(false);
                }}
            >
                <H5>{t('are-you-sure-you-want-to-disconnect-all-connected-viewing-devices')}</H5>
                <Text>{t('this-step-can-not-be-undone')}</Text>
            </Alert>
        </div>
    );
};


/*import { useEffect, useState, useCallback } from 'react';
import {
	Button,
	Text,
	Position,
	Drawer,
	Card,
	Alert,
	H4,
	DrawerSize,
} from '@blueprintjs/core';
import { Row, Col } from 'react-flexbox-grid';
import { createStyles, makeStyles } from '@material-ui/core/styles';
import CloseOverlayButton from './CloseOverlayButton';
import DeviceInfoCallout from './DeviceInfoCallout';
import SharingSourcePreviewCard from './SharingSourcePreviewCard';
import { Device } from '../../../common/Device';
import { IpcEvents } from '../../../common/IpcEvents.enum';
import isProduction from '../../../common/isProduction';
import { useTranslation } from 'react-i18next';

type DeviceWithDesktopCapturerSourceId = Device & {
	desktopCapturerSourceId: string;
};

interface ConnectedDevicesListDrawerProps {
	isOpen: boolean;
	handleToggle: () => void;
	handleReset: () => void;
}

const useStyles = makeStyles(() =>
	createStyles({
		drawerRoot: { overflowY: 'scroll', overflowX: 'hidden' },
		drawerInnerTopPanel: { padding: '20px 10px 0px 30px' },
		connectedDevicesRoot: { padding: '10px 20px' },
		topHeader: {
			marginRight: '20px',
			fontSize: '20px',
			fontWeight: 900,
		},
		zoomFullWidth: {
			width: '100%',
		},
	}),
);

export default function ConnectedDevicesListDrawer(
	props: ConnectedDevicesListDrawerProps,
) {
	const classes = useStyles();
	const { t } = useTranslation();

	const [isAlertDisconectAllOpen, setIsAlertDisconectAllOpen] = useState(false);
	const [connectedDevices, setConnectedDevices] = useState<
		DeviceWithDesktopCapturerSourceId[]
	>([]);
	const [devicesDisplayed, setDevicesDisplayed] = useState(new Map());

	useEffect(() => {
		function getConnectedDevicesCallback() {
			window.electron.ipcRenderer
				.invoke(IpcEvents.GetConnectedDevices)
				.then(async (devices: Device[]) => {
					const devicesWithSourceIds: DeviceWithDesktopCapturerSourceId[] = [];

					for await (const device of devices) {
						const sharingSourceId = await window.electron.ipcRenderer.invoke(
							IpcEvents.GetDesktopCapturerSourceIdBySharingSessionId,
							device.sharingSessionID,
						);
						devicesWithSourceIds.push({
							...device,
							desktopCapturerSourceId: sharingSourceId,
						});
					}
					setConnectedDevices(devicesWithSourceIds);

					const map = new Map();
					devicesWithSourceIds.forEach((el) => {
						map.set(el.id, true);
					});
					setDevicesDisplayed(map);
				})

				.catch((e) => console.error(e));
		}

		getConnectedDevicesCallback();

		const connectedDevicesInterval = setInterval(
			getConnectedDevicesCallback,
			4000,
		);

		return () => {
			clearInterval(connectedDevicesInterval);
		};
	}, []);

	const handleDisconnectOneDevice = useCallback(
		async (id: string) => {
			const device = connectedDevices.find((d: Device) => d.id === id);
			if (!device) return;
			await window.electron.ipcRenderer.invoke(
				IpcEvents.DisconnectPeerAndDestroySharingSessionBySessionID,
				device.sharingSessionID,
			);
			await window.electron.ipcRenderer.invoke(
				IpcEvents.DisconnectDeviceById,
				device.id,
			);
			setConnectedDevices(connectedDevices.filter((d: Device) => d.id !== id));
		},
		[connectedDevices, setConnectedDevices],
	);

	const handleDisconnectAll = useCallback(() => {
		connectedDevices.forEach((device: Device) => {
			window.electron.ipcRenderer.invoke(
				IpcEvents.DisconnectPeerAndDestroySharingSessionBySessionID,
				device.sharingSessionID,
			);
		});
		window.electron.ipcRenderer.invoke(IpcEvents.DisconnectAllDevices);
	}, [connectedDevices]);

	const hideOneDeviceInDevicesDisplayed = useCallback(
		(id) => {
			const newDevicesDisplayed = new Map(devicesDisplayed);
			newDevicesDisplayed.set(id, false);
			setDevicesDisplayed(newDevicesDisplayed);
			newDevicesDisplayed.delete(id);
			setDevicesDisplayed(newDevicesDisplayed);
			setConnectedDevices(
				connectedDevices.filter((device) => device.id !== id),
			);
		},
		[
			connectedDevices,
			setConnectedDevices,
			devicesDisplayed,
			setDevicesDisplayed,
		],
	);

	const hideAllDevicesInDevicesDisplayed = useCallback(() => {
		const newDevicesDisplayed = new Map(devicesDisplayed);
		[...newDevicesDisplayed.keys()].forEach((key) => {
			newDevicesDisplayed.set(key, false);
		});
		setDevicesDisplayed(newDevicesDisplayed);
	}, [devicesDisplayed, setDevicesDisplayed]);

	const handleDisconnectAndHideOneDevice = useCallback(
		(id) => {
			hideOneDeviceInDevicesDisplayed(id);
			handleDisconnectOneDevice(id);
		},
		[handleDisconnectOneDevice, hideOneDeviceInDevicesDisplayed],
	);

	const handleDisconnectAndHideAllDevices = useCallback(() => {
		hideAllDevicesInDevicesDisplayed();
		setTimeout(
			() => {
				handleDisconnectAll();
				props.handleToggle();
				props.handleReset();
			},
			isProduction() ? 1000 : 0,
		);
	}, [handleDisconnectAll, hideAllDevicesInDevicesDisplayed, props]);

	const disconnectAllCancelButtonText = t('no-cancel');
	const disconnectAllConfirmButtonText = t('yes-disconnect-all');

	return (
		<>
			<Drawer
				className={classes.drawerRoot}
				position={Position.BOTTOM}
				size={DrawerSize.LARGE}
				isOpen={props.isOpen}
				onClose={props.handleToggle}
				transitionDuration={0}
			>
				<Row between="xs" middle="xs" className={classes.drawerInnerTopPanel}>
					<Col xs={11}>
						<Row middle="xs">
							<div className={classes.topHeader}>
								<Text className="bp3-text-muted">{t('connected-devices')}</Text>
							</div>
							<Button
								intent="danger"
								disabled={connectedDevices.length === 0}
								onClick={() => {
									setIsAlertDisconectAllOpen(true);
								}}
								icon="disable"
								style={{
									borderRadius: '100px',
								}}
							>
								{t('disconnect-all-devices')}
							</Button>
						</Row>
					</Col>
					<Col xs={1}>
						<CloseOverlayButton onClick={props.handleToggle} isDefaultStyles />
					</Col>
				</Row>
				<Row className={classes.connectedDevicesRoot}>
					<Col xs={12}>
						<div className={classes.zoomFullWidth}>
							{connectedDevices.map((device) => {
								return (
									<div key={device.id}>
										<Card className="connected-device-card">
											<Row middle="xs">
												<Col xs={6}>
													<DeviceInfoCallout
														deviceType={device.deviceType}
														deviceOS={device.deviceOS}
														deviceIP={device.deviceIP}
														deviceBrowser={device.deviceBrowser}
														deviceRoomId={device.deviceRoomId}
													/>
												</Col>
												<Col xs={6}>
													<SharingSourcePreviewCard
														sharingSourceID={device.desktopCapturerSourceId}
													/>
												</Col>
											</Row>
											<Row center="xs">
												<Button
													id={`disconnect-device-${device.deviceIP}`}
													intent="danger"
													onClick={(): void => {
														handleDisconnectAndHideOneDevice(device.id);
													}}
													icon="disable"
													style={{
														borderRadius: '100px',
													}}
												>
													{t('disconnect')}
												</Button>
											</Row>
										</Card>
									</div>
								);
							})}
						</div>
					</Col>
				</Row>
			</Drawer>
			<Alert
				isOpen={isAlertDisconectAllOpen}
				onClose={() => {
					setIsAlertDisconectAllOpen(false);
				}}
				icon="warning-sign"
				cancelButtonText={disconnectAllCancelButtonText}
				confirmButtonText={disconnectAllConfirmButtonText}
				intent="danger"
				canEscapeKeyCancel
				canOutsideClickCancel
				onCancel={() => {
					setIsAlertDisconectAllOpen(false);
				}}
				onConfirm={handleDisconnectAndHideAllDevices}
				transitionDuration={0}
			>
				<H4>
					{t(
						'are-you-sure-you-want-to-disconnect-all-connected-viewing-devices',
					)}
				</H4>
				<Text>{t('this-step-can-not-be-undone')}</Text>
				<Text>{t('you-will-have-to-connect-all-devices-manually-again')}</Text>
			</Alert>
		</>
	);
}*/
