'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Github, BookOpen, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CTASection() {
    return (
        <section className="py-24 sm:py-32 relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 -z-10">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-primary/10" />
                <motion.div
                    animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl"
                />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.6 }}
                    className="text-center"
                >
                    {/* Headline */}
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
                        Ready to build your
                        <span className="block bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                            IoT platform?
                        </span>
                    </h2>
                    <p className="max-w-2xl mx-auto text-lg text-muted-foreground mb-12">
                        Get started in minutes. Self-host for complete control, or
                        contribute to make ThingBase even better.
                    </p>

                    {/* CTA Cards */}
                    <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto mb-12">
                        {/* Self Host Card */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            whileHover={{ y: -5 }}
                            className="group p-6 bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 hover:border-primary/30 transition-all text-left"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <Rocket className="h-5 w-5 text-primary" />
                                </div>
                                <h3 className="text-lg font-semibold">Self-Host</h3>
                            </div>
                            <p className="text-sm text-muted-foreground mb-6">
                                Deploy ThingBase on your own infrastructure. Full control over
                                your data and configuration.
                            </p>
                            <Button
                                asChild
                                className="w-full group/btn bg-gradient-to-r from-primary to-primary/80"
                            >
                                <Link href="/register">
                                    Get Started Free
                                    <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                                </Link>
                            </Button>
                        </motion.div>

                        {/* Contribute Card */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 }}
                            whileHover={{ y: -5 }}
                            className="group p-6 bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 hover:border-primary/30 transition-all text-left"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-lg bg-muted">
                                    <Github className="h-5 w-5" />
                                </div>
                                <h3 className="text-lg font-semibold">Contribute</h3>
                            </div>
                            <p className="text-sm text-muted-foreground mb-6">
                                Help us build the best open-source IoT platform. Every
                                contribution makes a difference.
                            </p>
                            <Button asChild variant="outline" className="w-full group/btn">
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
                    </div>

                    {/* Documentation Link */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.4 }}
                    >
                        <Link
                            href="#"
                            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                        >
                            <BookOpen className="h-4 w-4" />
                            Read the documentation
                            <ArrowRight className="h-3 w-3" />
                        </Link>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
