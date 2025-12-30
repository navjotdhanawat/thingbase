'use client';

import { motion } from 'framer-motion';

const techStack = [
    { name: 'Next.js 16', category: 'Web' },
    { name: 'Flutter', category: 'Mobile' },
    { name: 'NestJS', category: 'API' },
    { name: 'PostgreSQL', category: 'Database' },
    { name: 'Redis', category: 'Cache' },
    { name: 'Mosquitto', category: 'MQTT' },
];

export function ArchitectureSection() {
    return (
        <section id="architecture" className="py-24 sm:py-32 relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
                        Built on modern
                        <span className="block bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                            architecture
                        </span>
                    </h2>
                    <p className="max-w-2xl mx-auto text-lg text-muted-foreground">
                        Production-grade infrastructure that scales with your needs.
                        Real-time data flows from devices to dashboards.
                    </p>
                </motion.div>

                {/* Architecture Diagram */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: '-50px' }}
                    transition={{ duration: 0.8 }}
                    className="relative"
                >
                    <div className="bg-card/50 backdrop-blur-sm rounded-3xl border border-border/50 p-8 md:p-12">
                        {/* Flow Diagram */}
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-4 items-center">
                            {/* Clients */}
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="text-center"
                            >
                                <div className="text-xs font-medium text-muted-foreground mb-4 uppercase tracking-wider">
                                    Clients
                                </div>
                                <div className="space-y-3">
                                    {['Web App', 'Mobile App', 'IoT Devices'].map((client, i) => (
                                        <motion.div
                                            key={client}
                                            initial={{ opacity: 0, y: 10 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ delay: 0.3 + i * 0.1 }}
                                            className="px-4 py-3 bg-muted/50 rounded-xl border border-border/50 text-sm font-medium"
                                        >
                                            {client}
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>

                            {/* Arrow */}
                            <div className="hidden lg:flex items-center justify-center">
                                <motion.div
                                    initial={{ scaleX: 0 }}
                                    whileInView={{ scaleX: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: 0.5 }}
                                    className="w-full h-[2px] bg-gradient-to-r from-primary/50 via-primary to-primary/50 origin-left"
                                />
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    whileInView={{ opacity: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.8 }}
                                    className="absolute text-xs text-muted-foreground -mt-8"
                                >
                                    HTTP / WS / MQTT
                                </motion.div>
                            </div>

                            {/* API Layer */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: 0.4 }}
                                className="text-center"
                            >
                                <div className="text-xs font-medium text-muted-foreground mb-4 uppercase tracking-wider">
                                    API Layer
                                </div>
                                <div className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20">
                                    <div className="text-lg font-bold mb-2">NestJS API</div>
                                    <div className="flex flex-wrap gap-2 justify-center">
                                        {['Auth', 'Devices', 'MQTT', 'WebSocket'].map((module) => (
                                            <span
                                                key={module}
                                                className="px-2 py-1 text-xs bg-primary/10 rounded-lg text-primary"
                                            >
                                                {module}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>

                            {/* Arrow */}
                            <div className="hidden lg:flex items-center justify-center">
                                <motion.div
                                    initial={{ scaleX: 0 }}
                                    whileInView={{ scaleX: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: 0.7 }}
                                    className="w-full h-[2px] bg-gradient-to-r from-primary/50 via-primary to-primary/50 origin-left"
                                />
                            </div>

                            {/* Data Layer */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: 0.6 }}
                                className="text-center"
                            >
                                <div className="text-xs font-medium text-muted-foreground mb-4 uppercase tracking-wider">
                                    Data Layer
                                </div>
                                <div className="space-y-3">
                                    {[
                                        { name: 'PostgreSQL', desc: 'Data' },
                                        { name: 'Redis', desc: 'Cache + PubSub' },
                                        { name: 'Mosquitto', desc: 'MQTT Broker' },
                                    ].map((db, i) => (
                                        <motion.div
                                            key={db.name}
                                            initial={{ opacity: 0, y: 10 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ delay: 0.7 + i * 0.1 }}
                                            className="px-4 py-3 bg-muted/50 rounded-xl border border-border/50"
                                        >
                                            <div className="text-sm font-medium">{db.name}</div>
                                            <div className="text-xs text-muted-foreground">{db.desc}</div>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        </div>

                        {/* Data Flow Label */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 1 }}
                            className="mt-12 pt-8 border-t border-border/50"
                        >
                            <div className="text-center text-sm text-muted-foreground">
                                <span className="font-medium text-foreground">Real-Time Data Flow:</span>{' '}
                                Device → MQTT → API → Redis Pub/Sub → WebSocket → Clients
                            </div>
                        </motion.div>
                    </div>
                </motion.div>

                {/* Tech Stack Pills */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="mt-12 flex flex-wrap justify-center gap-4"
                >
                    {techStack.map((tech, index) => (
                        <motion.div
                            key={tech.name}
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.3, delay: 0.4 + index * 0.05 }}
                            whileHover={{ scale: 1.05 }}
                            className="group px-4 py-2 bg-card/80 backdrop-blur-sm rounded-full border border-border/50 hover:border-primary/30 transition-all cursor-default"
                        >
                            <span className="text-xs text-muted-foreground mr-2">
                                {tech.category}
                            </span>
                            <span className="text-sm font-medium group-hover:text-primary transition-colors">
                                {tech.name}
                            </span>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
