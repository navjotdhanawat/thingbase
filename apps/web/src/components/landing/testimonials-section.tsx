'use client';

import { motion } from 'framer-motion';
import { Github, Star, GitFork, Users } from 'lucide-react';

const stats = [
    { icon: Star, label: 'GitHub Stars', value: '⭐ Star us!' },
    { icon: GitFork, label: 'Forks', value: 'Fork & Build' },
    { icon: Users, label: 'Contributors', value: 'Join us!' },
];

const testimonials = [
    {
        quote:
            "ThingBase gave us the foundation we needed to build our IoT product without reinventing the wheel. The multi-tenant architecture was exactly what we needed.",
        author: 'IoT Developer',
        role: 'Building smart home solutions',
        avatar: '👨‍💻',
    },
    {
        quote:
            "Finally, an open-source IoT platform that doesn't cut corners on features. Real-time telemetry, MQTT integration, and mobile app out of the box!",
        author: 'Startup Founder',
        role: 'Industrial IoT startup',
        avatar: '🚀',
    },
    {
        quote:
            "Self-hosting our IoT platform means complete data control. ThingBase made it possible without building everything from scratch.",
        author: 'Enterprise Architect',
        role: 'Manufacturing company',
        avatar: '🏭',
    },
];

export function TestimonialsSection() {
    return (
        <section className="py-24 sm:py-32 relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 -z-10">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Open Source Stats */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border/50 text-sm font-medium text-muted-foreground mb-6">
                        <Github className="h-4 w-4" />
                        Open Source & Community Driven
                    </div>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
                        Built by developers,
                        <span className="block bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                            for developers
                        </span>
                    </h2>
                    <p className="max-w-2xl mx-auto text-lg text-muted-foreground">
                        Join our growing community of IoT developers building the future of
                        connected devices.
                    </p>
                </motion.div>

                {/* Stats */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="flex flex-wrap justify-center gap-8 mb-20"
                >
                    {stats.map((stat, index) => (
                        <motion.a
                            key={stat.label}
                            href="https://github.com/thingbase/thingbase"
                            target="_blank"
                            rel="noopener noreferrer"
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 + index * 0.1 }}
                            whileHover={{ scale: 1.05 }}
                            className="group flex flex-col items-center gap-2 p-6 bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 hover:border-primary/30 transition-all min-w-[160px]"
                        >
                            <stat.icon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                            <span className="text-2xl font-bold group-hover:text-primary transition-colors">
                                {stat.value}
                            </span>
                            <span className="text-sm text-muted-foreground">{stat.label}</span>
                        </motion.a>
                    ))}
                </motion.div>

                {/* Testimonials */}
                <div className="grid md:grid-cols-3 gap-6">
                    {testimonials.map((testimonial, index) => (
                        <motion.div
                            key={testimonial.author}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                            className="group relative"
                        >
                            <div className="h-full p-6 bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 hover:border-primary/20 transition-all duration-300">
                                {/* Quote */}
                                <div className="mb-6">
                                    <p className="text-sm leading-relaxed text-muted-foreground italic">
                                        &ldquo;{testimonial.quote}&rdquo;
                                    </p>
                                </div>

                                {/* Author */}
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">
                                        {testimonial.avatar}
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium">{testimonial.author}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {testimonial.role}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
