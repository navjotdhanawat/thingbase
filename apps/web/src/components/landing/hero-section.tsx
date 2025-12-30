'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Github, Cpu, Wifi, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function HeroSection() {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
            {/* Futuristic IoT Background Image - Theme-aware */}
            <div className="absolute inset-0 -z-20">
                {/* Light mode background */}
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat dark:hidden"
                    style={{
                        backgroundImage: 'url(/images/hero-bg-light.png)',
                    }}
                />
                {/* Dark mode background */}
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat hidden dark:block"
                    style={{
                        backgroundImage: 'url(/images/hero-bg.png)',
                        opacity: 0.7,
                    }}
                />
                {/* Subtle gradient overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-transparent to-background/40" />
            </div>

            {/* Animated Background Elements */}
            <div className="absolute inset-0 -z-10">
                {/* Gradient orbs */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse delay-1000" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-primary/5 to-transparent rounded-full blur-3xl" />

                {/* Grid pattern overlay */}
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: `linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)`,
                        backgroundSize: '60px 60px',
                    }}
                />
            </div>

            {/* Floating elements */}
            <motion.div
                initial={{ y: 0 }}
                animate={{ y: [-10, 10, -10] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute top-32 left-[15%] hidden lg:block"
            >
                <div className="p-3 bg-card/80 backdrop-blur-sm rounded-xl border border-border/50 shadow-xl">
                    <Wifi className="h-6 w-6 text-primary" />
                </div>
            </motion.div>

            <motion.div
                initial={{ y: 0 }}
                animate={{ y: [-10, 10, -10] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                className="absolute top-48 right-[18%] hidden lg:block"
            >
                <div className="p-3 bg-card/80 backdrop-blur-sm rounded-xl border border-border/50 shadow-xl">
                    <Cpu className="h-6 w-6 text-success" />
                </div>
            </motion.div>

            <motion.div
                initial={{ y: 0 }}
                animate={{ y: [-10, 10, -10] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
                className="absolute bottom-48 left-[20%] hidden lg:block"
            >
                <div className="p-3 bg-card/80 backdrop-blur-sm rounded-xl border border-border/50 shadow-xl">
                    <Zap className="h-6 w-6 text-warning" />
                </div>
            </motion.div>

            {/* Connection lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none hidden lg:block" style={{ zIndex: -1 }}>
                <motion.path
                    d="M200,200 Q400,300 600,250"
                    stroke="url(#gradient1)"
                    strokeWidth="1"
                    fill="none"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.3 }}
                    transition={{ duration: 2, delay: 0.5 }}
                />
                <defs>
                    <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity="0" />
                        <stop offset="50%" stopColor="var(--primary)" stopOpacity="1" />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                    </linearGradient>
                </defs>
            </svg>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <div className="text-center">
                    {/* Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary mb-8"
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                        </span>
                        Open Source IoT Platform
                    </motion.div>

                    {/* Headline */}
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6"
                    >
                        <span className="block">The Open-Source</span>
                        <span className="block bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                            IoT Platform
                        </span>
                        <span className="block">for Developers</span>
                    </motion.h1>

                    {/* Subheadline */}
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="max-w-2xl mx-auto text-lg sm:text-xl text-muted-foreground mb-10"
                    >
                        Device management, real-time telemetry, and multi-tenant control.
                        Connect, monitor, and manage your IoT devices at any scale.
                    </motion.p>

                    {/* CTA Buttons */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4"
                    >
                        <Button
                            size="lg"
                            asChild
                            className="group bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-xl shadow-primary/25 px-8 h-12 text-base"
                        >
                            <Link href="/register">
                                Get Started Free
                                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            asChild
                            className="group px-8 h-12 text-base border-border/50 hover:bg-muted/50"
                        >
                            <Link
                                href="https://github.com/thingbase/thingbase"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Github className="mr-2 h-4 w-4" />
                                View on GitHub
                            </Link>
                        </Button>
                    </motion.div>

                    {/* Tech Stack Badges */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        className="mt-16 flex flex-wrap items-center justify-center gap-3"
                    >
                        <span className="text-sm text-muted-foreground">Built with</span>
                        {['Next.js 16', 'NestJS', 'PostgreSQL', 'Redis', 'MQTT', 'Flutter'].map(
                            (tech, index) => (
                                <motion.span
                                    key={tech}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
                                    className="px-3 py-1 text-xs font-medium bg-muted/50 rounded-full border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors cursor-default"
                                >
                                    {tech}
                                </motion.span>
                            )
                        )}
                    </motion.div>
                </div>
            </div>

            {/* Scroll indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2"
            >
                <motion.div
                    animate={{ y: [0, 8, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2"
                >
                    <motion.div className="w-1 h-2 rounded-full bg-muted-foreground/50" />
                </motion.div>
            </motion.div>
        </section>
    );
}
