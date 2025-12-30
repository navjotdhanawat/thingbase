'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Copy, Check, Terminal, Zap, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';

const codeExamples = [
    {
        id: 'rest',
        label: 'REST API',
        icon: Terminal,
        language: 'typescript',
        code: `// Create a new device
const response = await fetch('/api/v1/devices', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Temperature Sensor',
    deviceTypeId: 'thermostat',
    metadata: { location: 'Factory A' }
  })
});

const device = await response.json();
console.log('Device created:', device.id);`,
    },
    {
        id: 'mqtt',
        label: 'MQTT Publish',
        icon: Wifi,
        language: 'typescript',
        code: `// Publish telemetry from your IoT device
import mqtt from 'mqtt';

const client = mqtt.connect('mqtt://localhost:1883');

client.on('connect', () => {
  // Publish sensor data
  const telemetry = {
    temperature: 23.5,
    humidity: 45,
    timestamp: Date.now()
  };
  
  client.publish(
    'thingbase/{tenantId}/devices/{deviceId}/telemetry',
    JSON.stringify(telemetry)
  );
});`,
    },
    {
        id: 'websocket',
        label: 'Real-Time',
        icon: Zap,
        language: 'typescript',
        code: `// Subscribe to real-time updates
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: { token: '<your-jwt-token>' }
});

// Listen for device telemetry
socket.on('device:telemetry', (data) => {
  console.log('New telemetry:', data);
  // Update your dashboard in real-time
});

// Listen for device status changes
socket.on('device:status', (data) => {
  console.log('Device', data.deviceId, 'is', data.status);
});`,
    },
];

export function CodeSection() {
    const [activeTab, setActiveTab] = useState('rest');
    const [copied, setCopied] = useState(false);

    const activeExample = codeExamples.find((ex) => ex.id === activeTab)!;

    const copyToClipboard = async () => {
        await navigator.clipboard.writeText(activeExample.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <section id="code" className="py-24 sm:py-32 relative">
            {/* Background */}
            <div className="absolute inset-0 -z-10">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/20 to-transparent" />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                    {/* Left Content */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: '-100px' }}
                        transition={{ duration: 0.6 }}
                    >
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
                            Start sending data
                            <span className="block bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                                in minutes
                            </span>
                        </h2>
                        <p className="text-lg text-muted-foreground mb-8">
                            A simple, elegant interface so you can start managing devices in
                            minutes. REST API, MQTT, and WebSocket - choose what works for
                            your stack.
                        </p>

                        <div className="space-y-4">
                            {[
                                'REST API for device management & configuration',
                                'MQTT for high-throughput telemetry data',
                                'WebSocket for real-time dashboard updates',
                                'SDKs for Node.js, Python, and more (coming soon)',
                            ].map((feature, index) => (
                                <motion.div
                                    key={feature}
                                    initial={{ opacity: 0, x: -10 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.2 + index * 0.1 }}
                                    className="flex items-center gap-3"
                                >
                                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Check className="h-3 w-3 text-primary" />
                                    </div>
                                    <span className="text-sm text-muted-foreground">{feature}</span>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Right - Code Block */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: '-100px' }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="relative"
                    >
                        <div className="bg-[#0d1117] rounded-2xl border border-[#30363d] overflow-hidden shadow-2xl">
                            {/* Tab Bar */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d] bg-[#161b22]">
                                <div className="flex gap-1">
                                    {codeExamples.map((example) => (
                                        <button
                                            key={example.id}
                                            onClick={() => setActiveTab(example.id)}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === example.id
                                                    ? 'bg-[#30363d] text-white'
                                                    : 'text-[#7d8590] hover:text-white'
                                                }`}
                                        >
                                            <example.icon className="h-3.5 w-3.5" />
                                            {example.label}
                                        </button>
                                    ))}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={copyToClipboard}
                                    className="text-[#7d8590] hover:text-white hover:bg-[#30363d]"
                                >
                                    {copied ? (
                                        <Check className="h-4 w-4" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>

                            {/* Code Content */}
                            <div className="relative">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activeTab}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="p-4 overflow-x-auto"
                                    >
                                        <pre className="text-sm font-mono leading-relaxed">
                                            <code className="text-[#e6edf3]">
                                                {activeExample.code.split('\n').map((line, i) => (
                                                    <div key={i} className="flex">
                                                        <span className="w-8 flex-shrink-0 text-[#7d8590] select-none text-right pr-4">
                                                            {i + 1}
                                                        </span>
                                                        <span
                                                            dangerouslySetInnerHTML={{
                                                                __html: highlightSyntax(line),
                                                            }}
                                                        />
                                                    </div>
                                                ))}
                                            </code>
                                        </pre>
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Decorative gradient */}
                        <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-primary/20 via-primary/5 to-primary/20 -z-10 blur-sm" />
                    </motion.div>
                </div>
            </div>
        </section>
    );
}

// Simple syntax highlighting
function highlightSyntax(line: string): string {
    return line
        // Comments
        .replace(/(\/\/.*)/g, '<span style="color: #7d8590">$1</span>')
        // Strings
        .replace(/('[^']*')/g, '<span style="color: #a5d6ff">$1</span>')
        .replace(/("[^"]*")/g, '<span style="color: #a5d6ff">$1</span>')
        .replace(/(`[^`]*`)/g, '<span style="color: #a5d6ff">$1</span>')
        // Keywords
        .replace(
            /\b(const|let|var|import|from|await|async|function|return|if|else)\b/g,
            '<span style="color: #ff7b72">$1</span>'
        )
        // Functions
        .replace(
            /\b(fetch|console|JSON|setTimeout|Date)\b/g,
            '<span style="color: #d2a8ff">$1</span>'
        )
        // Methods
        .replace(
            /\.(log|stringify|parse|connect|on|publish|json)\b/g,
            '.<span style="color: #79c0ff">$1</span>'
        );
}
