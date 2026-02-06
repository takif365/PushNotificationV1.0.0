'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export default function GlobalPulseMap({ tokens = [] }) {
    const [adminLocation, setAdminLocation] = useState(null);

    // Auto-detect admin's IP location on mount
    useEffect(() => {
        fetch('/api/my-location')
            .then(res => res.json())
            .then(data => {
                if (data.coordinates?.lat && data.coordinates?.lng) {
                    setAdminLocation({
                        name: `Admin (${data.city}, ${data.country})`,
                        coordinates: [data.coordinates.lng, data.coordinates.lat],
                        key: 'admin-location'
                    });
                }
            })
            .catch(err => console.error('Failed to detect admin location:', err));
    }, []);

    const markers = useMemo(() => {
        const validTokens = tokens.filter(t => t.coordinates?.lat && t.coordinates?.lng);
        return validTokens.map(t => ({
            name: t.country || 'Unknown',
            coordinates: [t.coordinates.lng, t.coordinates.lat],
            key: t.token
        }));
    }, [tokens]);

    return (
        <div style={{
            width: '100%',
            height: '550px',
            backgroundColor: '#050505',
            borderRadius: '8px',
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            <div style={{
                width: '100%',
                height: '100%',
                position: 'relative'
            }}>
                <ComposableMap
                    projection="geoMercator"
                    projectionConfig={{
                        scale: 120,
                        center: [5, 35] // Shifted down more to center vertically and show Greenland
                    }}
                    style={{ width: "100%", height: "100%" }}
                >
                    <Geographies geography={geoUrl}>
                        {({ geographies }) =>
                            geographies
                                .filter(geo => {
                                    // Filter out Antarctica to crop dead space
                                    const name = geo.properties.name;
                                    return name !== 'Antarctica';
                                })
                                .map((geo) => {
                                    const countryName = geo.properties.name;
                                    const isAlgeria = countryName === 'Algeria';

                                    return (
                                        <Geography
                                            key={geo.rsmKey}
                                            geography={geo}
                                            fill={isAlgeria ? "rgba(0, 255, 255, 0.15)" : "#0a0a0a"}
                                            stroke="#00ffff"
                                            strokeWidth={isAlgeria ? 1 : 0.4}
                                            strokeOpacity={isAlgeria ? 0.6 : 0.3}
                                            style={{
                                                default: {
                                                    fill: isAlgeria ? "rgba(0, 255, 255, 0.15)" : "#0a0a0a",
                                                    stroke: "#00ffff",
                                                    strokeWidth: isAlgeria ? 1 : 0.4,
                                                    strokeOpacity: isAlgeria ? 0.6 : 0.3,
                                                    outline: "none"
                                                },
                                                hover: {
                                                    fill: isAlgeria ? "rgba(0, 255, 255, 0.25)" : "#111",
                                                    stroke: "#00ffff",
                                                    strokeWidth: isAlgeria ? 1.2 : 0.6,
                                                    strokeOpacity: isAlgeria ? 0.8 : 0.5,
                                                    outline: "none"
                                                },
                                                pressed: {
                                                    fill: isAlgeria ? "rgba(0, 255, 255, 0.15)" : "#0a0a0a",
                                                    outline: "none"
                                                },
                                            }}
                                        />
                                    );
                                })
                        }
                    </Geographies>

                    {/* Admin Location Pulse - Auto-detected */}
                    {adminLocation && (
                        <Marker coordinates={adminLocation.coordinates}>
                            <circle r={5} fill="var(--accent-neon)" fillOpacity={0.5} className="admin-pulse" />
                            <title>{adminLocation.name}</title>
                        </Marker>
                    )}

                    {/* Real subscriber markers */}
                    {markers.map(({ name, coordinates, key }) => (
                        <Marker key={key} coordinates={coordinates}>
                            <circle r={4} fill="var(--accent-neon)" fillOpacity={0.8} className="pulse-dot" />
                            <title>{name}</title>
                        </Marker>
                    ))}
                </ComposableMap>
            </div>

            <style jsx global>{`
                .pulse-dot {
                    animation: pulse 2s infinite;
                }
                .admin-pulse {
                    animation: admin-fade 0.8s ease-in-out infinite;
                }
                @keyframes pulse {
                    0% {
                        r: 4;
                        fill-opacity: 0.8;
                    }
                    50% {
                        r: 7;
                        fill-opacity: 0.3;
                    }
                    100% {
                        r: 4;
                        fill-opacity: 0.8;
                    }
                }
                @keyframes admin-fade {
                    0%, 100% {
                        r: 5;
                        fill-opacity: 0.3;
                    }
                    50% {
                        r: 9;
                        fill-opacity: 0.8;
                    }
                }
            `}</style>
        </div>
    );
}
