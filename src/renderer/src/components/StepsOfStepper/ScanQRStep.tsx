import React, { useEffect, useMemo, useState } from 'react';
import {
    Button,
    Text,
    Tooltip,
    Position,
    Dialog,
    Classes,
    H3,
} from '@blueprintjs/core';
import { QRCodeSVG } from 'qrcode.react';
import { makeStyles, createStyles } from '@material-ui/core';
import { Row, Col } from 'react-flexbox-grid';
import isProduction from '../../../../common/isProduction';
import { IpcEvents } from '../../../../common/IpcEvents.enum';
import { useTranslation } from 'react-i18next';
import Logo192 from '../../assets/logo192.png';

const useStyles = makeStyles(() =>
    createStyles({
        smallQRCode: {
            height: '100%',
            border: '1px solid transparent',
            padding: '10px',
            borderRadius: '10px',
            margin: '0 auto',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
                backgroundColor: 'rgba(0,0,0,0.06)',
                borderColor: '#8A9BA8',
                cursor: 'zoom-in',
            },
        },
        dialogQRWrapper: {
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '10px',
        },
        bigQRCodeDialogRoot: {
            '&:hover': {
                cursor: 'zoom-out',
            },
            paddingBottom: '0px',
        },
        // Estilos para la sección de conexión manual integrada
        manualConnectionCard: {
            backgroundColor: '#f8fa0f0', // Fondo tenue
            border: '1px solid #E1E8ED',
            borderRadius: '12px',
            padding: '16px',
            marginTop: '12px',
            width: '100%',
            maxWidth: '380px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        },
        toggleManualBtn: {
            color: '#5C7080 !important',
            fontWeight: 600,
            fontSize: '13px',
            marginTop: '8px',
            '&:hover': {
                color: '#106BA3 !important',
                backgroundColor: 'transparent !important',
            },
        },
    }),
);

const ScanQRStep: React.FC = () => {
    const { t } = useTranslation();
    const [clientViewerPort, setClientViewerPort] = useState('80');
    const classes = useStyles();

    const [isViewerSlotAvailable, setIsViewerSlotAvailable] = useState(true);
    const [roomID, setRoomID] = useState('');
    const [LOCAL_LAN_IP, setLocalLanIP] = useState('');
    const [isQRCodeMagnified, setIsQRCodeMagnified] = useState(false);
    const [showManualConnection, setShowManualConnection] = useState(false);

    useEffect(() => {
        window.electron.ipcRenderer
            .invoke(IpcEvents.GetPort)
            .then((port) => setClientViewerPort(port))
            .catch((error) => console.error('Failed to get port:', error));
    }, []);

    useEffect(() => {
        let cancelled = false;

        const handleAvailabilityChange = (
            _: unknown,
            payload: { isAvailable: boolean },
        ): void => {
            if (cancelled) return;
            const isAvailable = Boolean(payload?.isAvailable);
            setIsViewerSlotAvailable(isAvailable);
            if (!isAvailable) {
                setRoomID('');
                setIsQRCodeMagnified(false);
            }
        };

        window.electron.ipcRenderer
            .invoke(IpcEvents.GetViewerConnectionAvailability)
            .then((availability) => {
                if (cancelled) return;
                const isAvailable = Boolean(availability);
                setIsViewerSlotAvailable(isAvailable);
                if (!isAvailable) {
                    setRoomID('');
                    setIsQRCodeMagnified(false);
                }
            })
            .catch((error) => {
                console.error('Failed to get viewer slot availability:', error);
            });

        window.electron.ipcRenderer.on(
            IpcEvents.ViewerConnectionAvailabilityChanged,
            handleAvailabilityChange,
        );

        return () => {
            cancelled = true;
            window.electron.ipcRenderer.removeListener(
                IpcEvents.ViewerConnectionAvailabilityChanged,
                handleAvailabilityChange,
            );
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        const fetchRoomId = async (): Promise<void> => {
            const roomId = await window.electron.ipcRenderer.invoke(
                IpcEvents.GetWaitingForConnectionSharingSessionRoomId,
            );
            if (cancelled) return;
            if (typeof roomId === 'string' && roomId !== '' && isViewerSlotAvailable) {
                setRoomID(roomId);
            } else {
                setRoomID('');
            }
        };

        const fetchLocalIp = async (): Promise<void> => {
            const gotIP = await window.electron.ipcRenderer.invoke('get-local-lan-ip');
            if (!cancelled && gotIP) {
                setLocalLanIP(gotIP);
            }
        };

        void fetchRoomId();
        void fetchLocalIp();
        const roomInterval = setInterval(() => void fetchRoomId(), 1000);
        const ipInterval = setInterval(() => void fetchLocalIp(), 1000);

        return () => {
            cancelled = true;
            clearInterval(roomInterval);
            clearInterval(ipInterval);
        };
    }, [isViewerSlotAvailable]);

    const portString = useMemo(() => `:${clientViewerPort}`, [clientViewerPort]);
    const roomPath = useMemo(() => (roomID !== '' ? `/${roomID}` : ''), [roomID]);
    const shareUrl = useMemo(() => {
        if (!isViewerSlotAvailable || LOCAL_LAN_IP === '' || roomPath === '') return '';
        return `http://${LOCAL_LAN_IP}${portString}${roomPath}`;
    }, [LOCAL_LAN_IP, portString, roomPath, isViewerSlotAvailable]);

    const isQrInteractive = shareUrl !== '';
    const connectionLimitTooltip = t('connection-limit-reached-tooltip');
    const qrTooltipContent = isQrInteractive ? t('click-to-make-bigger') : connectionLimitTooltip;
    const copyTooltipContent = isQrInteractive ? t('click-to-copy') : connectionLimitTooltip;

    return (
        <>
            {/* Banner de aviso Wi-Fi */}
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <Text>
                    <span
                        style={{
                            backgroundColor: 'rgba(0, 249, 146, 0.25)',
                            fontWeight: 700,
                            padding: '6px 14px',
                            borderRadius: '20px',
                            fontSize: '13px',
                        }}
                    >
                        {t('make-sure-your-computer-and-screen-viewing-device-are-connected-to-same-wi-fi')}
                    </span>
                </Text>
            </div>

            {/* Estado de búsqueda / Animación */}
            <Row center="xs">
                <Col xs={12}>
                    <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                        <Text className="bp3-text" style={{ fontSize: '15px', fontWeight: 500 }}>
                            {t('Searching-devices')}
                        </Text>
                    </div>

                    {/* Desplegable de Conexión Manual */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Button
                            minimal
                            className={classes.toggleManualBtn}
                            icon={showManualConnection ? 'chevron-up' : 'chevron-down'}
                            onClick={() => setShowManualConnection(!showManualConnection)}
                        >
                            {showManualConnection ? 'Ocultar conexión manual' : '¿No aparece tu dispositivo? Conexión manual'}
                        </Button>

                        {showManualConnection && (
                            <div className={classes.manualConnectionCard}>
                                <Text
                                    className="bp3-text-muted"
                                    style={{ fontSize: '13px', marginBottom: '12px', textAlign: 'center' }}
                                >
                                    Escaneá el código QR desde la app de ScreenBacon
                                </Text>

                                <Tooltip content={qrTooltipContent} position={Position.BOTTOM}>
                                    <span>
                                        {isQrInteractive ? (
                                            <Button
                                                id="magnify-qr-code-button"
                                                className={classes.smallQRCode}
                                                onClick={() => setIsQRCodeMagnified(true)}
                                                disabled={!isQrInteractive}
                                                minimal
                                            >
                                                <QRCodeSVG
                                                    value={shareUrl}
                                                    level="H"
                                                    bgColor="transparent"
                                                    fgColor="#182026"
                                                    imageSettings={{
                                                        src: Logo192,
                                                        width: 36,
                                                        height: 36,
                                                        excavate: true,
                                                    }}
                                                />
                                            </Button>
                                        ) : (
                                            <div className={classes.smallQRCode} style={{ cursor: 'not-allowed' }}>
                                                <img src={Logo192} alt={t('ScreenBacon-logo')} width={64} height={64} />
                                            </div>
                                        )}
                                    </span>
                                </Tooltip>
                            </div>
                        )}
                    </div>
                </Col>
            </Row>

            {/* URL y Copiado */}
            <Row center="xs" style={{ marginTop: '20px', marginBottom: '8px' }}>
                <Text className="bp3-text-muted">
                    {isQrInteractive
                        ? t('enter-the-following-address-in-browser-address-bar-on-any-device')
                        : t('one-viewing-client-is-connected-already')}
                </Text>
            </Row>

            <Row center="xs">
                <Tooltip content={copyTooltipContent} position={Position.TOP}>
                    <span>
                        <Button
                            intent={isQrInteractive ? 'primary' : 'none'}
                            icon="duplicate"
                            style={{ borderRadius: '20px', paddingLeft: '16px', paddingRight: '16px' }}
                            disabled={!isQrInteractive}
                            onClick={() => {
                                if (!isQrInteractive) return;
                                window.electron.ipcRenderer.invoke(IpcEvents.WriteTextToClipboard, shareUrl);
                            }}
                        >
                            {isQrInteractive ? shareUrl : t('viewing-client-connected-label')}
                        </Button>
                    </span>
                </Tooltip>
            </Row>

            {!isQrInteractive && (
                <Row center="xs" style={{ marginTop: '16px' }}>
                    <Col xs={12}>
                        <Text className="bp3-text-muted" style={{ display: 'block', fontSize: '12px' }}>
                            {t('ScreenBacon-ce-allows-only-one-client-at-same-time')}
                        </Text>
                        <Text className="bp3-text-muted" style={{ display: 'block', fontSize: '12px' }}>
                            {t('this-will-be-available-only-in-pro-version')}
                        </Text>
                    </Col>
                </Row>
            )}

            {/* Modal para el QR Ampliado */}
            <Dialog
                className={classes.bigQRCodeDialogRoot}
                isOpen={isQrInteractive && isQRCodeMagnified}
                onClose={() => setIsQRCodeMagnified(false)}
                canEscapeKeyClose
                canOutsideClickClose
                transitionDuration={isProduction() ? 300 : 0}
                style={{ position: 'relative', top: '0px' }}
                usePortal={false}
            >
                <Row
                    id="qr-code-dialog-inner"
                    className={Classes.DIALOG_BODY}
                    center="xs"
                    middle="xs"
                    onClick={() => setIsQRCodeMagnified(false)}
                >
                    <Col xs={11} className={classes.dialogQRWrapper}>
                        <QRCodeSVG
                            value={isQrInteractive ? shareUrl : 'INACTIVE'}
                            level="H"
                            imageSettings={{
                                src: Logo192,
                                width: 25,
                                height: 25,
                                excavate: true,
                            }}
                            width="360px"
                            height="360px"
                        />
                    </Col>
                    <Col style={{ marginTop: '12px' }}>
                        <H3 style={{ margin: 0 }}>{isQrInteractive ? shareUrl : t('waiting-for-connection')}</H3>
                    </Col>
                </Row>
            </Dialog>
        </>
    );
};

export default ScanQRStep;