"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/apiClient";
import { getApiErrorMessage } from "@iron-protocol/api-client";

interface DeviceConfig {
  name: string;
  icon: string;
  status: "connected" | "disconnected" | "simulated";
  description: string;
  dataPoints: string[];
}

export default function ConnectPage() {
  const router = useRouter();
  const [devices, setDevices] = useState<Record<string, DeviceConfig>>({
    apple_health: {
      name: "Apple Health",
      icon: "\u2764\ufe0f",
      status: "disconnected",
      description: "Apple Health data is accessed through connected wearables (WHOOP, Oura) or via companion app.",
      dataPoints: ["HRV", "Sleep", "Resting HR", "Respiratory Rate", "Workouts"],
    },
    whoop: {
      name: "WHOOP",
      icon: "\ud83d\udfe2",
      status: "disconnected",
      description: "Connect your WHOOP band for automatic recovery, strain, and sleep data.",
      dataPoints: ["HRV (RMSSD)", "Sleep Stages", "RHR", "Respiratory Rate", "Strain Score", "SpO2"],
    },
    oura: {
      name: "Oura Ring",
      icon: "\ud83d\udc8d",
      status: "disconnected",
      description: "Connect your Oura Ring for daily readiness, sleep, and activity data.",
      dataPoints: ["HRV", "Sleep Score", "RHR", "Body Temperature", "Activity"],
    },
  });
  const [simulating, setSimulating] = useState<string | null>(null);
  const [oauthNotice, setOauthNotice] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  async function simulateImport(source: string) {
    setSimulating(source);
    setImportError(null);
    try {
      // Generate realistic mock data
      const mockData = {
        hrvMs: 40 + Math.round(Math.random() * 40),
        sleepHours: 5.5 + Math.round(Math.random() * 30) / 10,
        sleepQuality: 4 + Math.floor(Math.random() * 6),
        mood: 4 + Math.floor(Math.random() * 6),
        soreness: 2 + Math.floor(Math.random() * 6),
        energy: 4 + Math.floor(Math.random() * 6),
        stress: 2 + Math.floor(Math.random() * 6),
        notes: `Simulated import from ${source.toUpperCase()}`,
      };

      await api.checkin.submit(mockData);
      setDevices((prev) => ({
        ...prev,
        [source]: { ...prev[source], status: "simulated" },
      }));
      setTimeout(() => router.push("/"), 1000);
    } catch (err) {
      setImportError(getApiErrorMessage(err, "Simulated import failed."));
    } finally {
      setSimulating(null);
    }
  }

  function handleConnect(source: string) {
    // Real OAuth flow is owned by a separate work stream; show an inline
    // notice instead of a jarring alert() so users know to use Simulate.
    setOauthNotice(source);
    setTimeout(() => setOauthNotice((cur) => (cur === source ? null : cur)), 4000);
  }

  return (
    <div className="pb-20 md:pb-6 space-y-6">
      <h1 className="text-2xl font-bold">Connected Devices</h1>
      <p className="text-iron-400 text-sm">
        Connect your wearables to automatically import biometric data. Apple Health data flows through your connected devices.
      </p>

      {importError && (
        <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded px-3 py-2">{importError}</p>
      )}

      <div className="space-y-4">
        {Object.entries(devices).map(([key, device]) => (
          <div key={key} className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{device.icon}</span>
                <div>
                  <h3 className="font-semibold text-lg">{device.name}</h3>
                  <span className={`text-xs font-medium ${
                    device.status === "connected" ? "text-green-400" :
                    device.status === "simulated" ? "text-blue-400" :
                    "text-iron-500"
                  }`}>
                    {device.status === "connected" ? "Connected" :
                     device.status === "simulated" ? "Simulated" :
                     "Not Connected"}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-sm text-iron-400 mb-3">{device.description}</p>

            <div className="flex flex-wrap gap-2 mb-4">
              {device.dataPoints.map((dp) => (
                <span key={dp} className="text-xs bg-iron-800 text-iron-300 px-2 py-1 rounded border border-iron-700">
                  {dp}
                </span>
              ))}
            </div>

            <div className="flex gap-3">
              {key !== "apple_health" && (
                <button
                  onClick={() => handleConnect(key)}
                  className="btn-secondary flex-1"
                  disabled={device.status === "connected"}
                >
                  {device.status === "connected" ? "Connected" : "Connect via OAuth"}
                </button>
              )}
              <button
                onClick={() => simulateImport(key)}
                className="btn-primary flex-1"
                disabled={simulating === key}
              >
                {simulating === key ? "Importing..." :
                 device.status === "simulated" ? "Import Again" :
                 "Simulate Import"}
              </button>
            </div>
            {oauthNotice === key && (
              <p className="text-xs text-amber-300 bg-amber-950/40 border border-amber-900 rounded px-3 py-2 mt-3">
                OAuth flow for {device.name} isn't wired up yet. Use "Simulate Import" to test with mock data.
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Info Card */}
      <div className="card border-iron-700">
        <h3 className="font-semibold mb-2">How It Works</h3>
        <div className="text-sm text-iron-400 space-y-2">
          <p>
            Apple Health has no web API. Your biometric data reaches Iron Protocol through your connected wearables (WHOOP, Oura Ring) which sync via OAuth 2.0 REST APIs.
          </p>
          <p>
            When connected, data flows automatically: <span className="text-iron-200">Wearable sensor &rarr; Device app &rarr; Cloud API &rarr; Iron Protocol</span>
          </p>
          <p>
            You can always enter data manually through the <a href="/checkin" className="text-accent hover:text-accent-light">Daily Check-In</a> page.
          </p>
        </div>
      </div>
    </div>
  );
}
