'use client';

import { motion } from 'framer-motion';
import {
    Building2,
    Cpu,
    LineChart,
    Bell,
    Shield,
    Smartphone,
} from 'lucide-react';

const features = [
    {
        icon: Building2,
        title: 'Multi-Tenancy',
        description:
            'Complete tenant isolation with white-label support. Each organization has its own devices, users, and data with role-based access control.',
        color: 'from-blue-500 to-blue-600',
    },
    {
        icon: LineChart,
        title: 'Real-Time Telemetry',
        description:
            'MQTT broker with WebSocket streaming. Live updates to web and mobile clients with TimescaleDB-ready historical storage.',
        color: 'from-green-500 to-green-600',
    },
    {
        icon: Smartphone,
        title: 'Cross-Platform',
        description:
            'Next.js web dashboard and Flutter mobile app. Real-time Socket.IO updates and QR-based device provisioning.',
        color: 'from-purple-500 to-purple-600',
    },
    {
        icon: Cpu,
        title: 'Device Management',
        description:
            'Full device lifecycle - provisioning, types, commands with ACK tracking. Redis-cached state shadows for instant access.',
        color: 'from-orange-500 to-orange-600',
    },
    {
        icon: Bell,
        title: 'Alerts & Monitoring',
        description:
            'Threshold-based alert rules with device offline detection via MQTT LWT. Track and acknowledge alerts in real-time.',
        color: 'from-red-500 to-red-600',
    },
    {
        icon: Shield,
        title: 'Enterprise Security',
        description:
            'JWT authentication with refresh tokens, per-endpoint rate limiting, database-level tenant isolation, and audit logging.',
        color: 'from-indigo-500 to-indigo-600',
    },
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.5,
        },
    },
};

export function FeaturesSection() {
    return (
        <section id="features" className="py-24 sm:py-32 relative">
            {/* Background */}
            <div className="absolute inset-0 -z-10">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/30 to-transparent" />
            </div>

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
                        Everything you need to
                        <span className="block bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                            build IoT products
                        </span>
                    </h2>
                    <p className="max-w-2xl mx-auto text-lg text-muted-foreground">
                        A complete platform for managing IoT devices at scale. From device
                        provisioning to real-time monitoring.
                    </p>
                </motion.div>

                {/* Features Grid */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-50px' }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    {features.map((feature) => (
                        <motion.div
                            key={feature.title}
                            variants={itemVariants}
                            className="group relative"
                        >
                            <div className="relative h-full p-6 bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-black/5">
                                {/* Gradient overlay on hover */}
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                {/* Icon */}
                                <div className="relative mb-4">
                                    <div
                                        className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color} shadow-lg`}
                                    >
                                        <feature.icon className="h-6 w-6 text-white" />
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="relative">
                                    <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                                        {feature.title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {feature.description}
                                    </p>
                                </div>

                                {/* Hover decoration */}
                                <motion.div
                                    className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent rounded-b-2xl"
                                    initial={{ scaleX: 0, opacity: 0 }}
                                    whileHover={{ scaleX: 1, opacity: 1 }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
