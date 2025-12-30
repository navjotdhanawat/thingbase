'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Cpu, Github, Twitter, MessageCircle } from 'lucide-react';

type FooterLink = {
    label: string;
    href: string;
    external?: boolean;
};

const footerLinks: Record<string, FooterLink[]> = {
    Product: [
        { label: 'Features', href: '#features' },
        { label: 'Architecture', href: '#architecture' },
        { label: 'Quick Start', href: '#code' },
        { label: 'Pricing', href: '#' },
    ],
    Resources: [
        { label: 'Documentation', href: '#' },
        { label: 'API Reference', href: '#' },
        { label: 'Device Simulator', href: '#' },
        { label: 'Examples', href: '#' },
    ],
    Community: [
        { label: 'GitHub', href: 'https://github.com/thingbase/thingbase', external: true },
        { label: 'Discord', href: '#', external: true },
        { label: 'Twitter', href: '#', external: true },
        { label: 'Contributing', href: '#' },
    ],
    Legal: [
        { label: 'MIT License', href: '#' },
        { label: 'Privacy Policy', href: '#' },
        { label: 'Terms of Service', href: '#' },
    ],
};

const socialLinks = [
    { icon: Github, href: 'https://github.com/thingbase/thingbase', label: 'GitHub' },
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: MessageCircle, href: '#', label: 'Discord' },
];

export function Footer() {
    return (
        <footer className="relative border-t border-border/50 bg-muted/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Main Footer */}
                <div className="py-12 lg:py-16">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
                        {/* Brand Column */}
                        <div className="col-span-2 md:col-span-4 lg:col-span-1 mb-8 lg:mb-0">
                            <Link href="/" className="flex items-center gap-2 mb-4">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70">
                                    <Cpu className="h-5 w-5 text-primary-foreground" />
                                </div>
                                <span className="text-xl font-bold">ThingBase</span>
                            </Link>
                            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                                Open-source IoT platform for developers. Device management,
                                real-time telemetry, and multi-tenant control.
                            </p>
                            {/* Social Links */}
                            <div className="flex gap-3">
                                {socialLinks.map((social) => (
                                    <motion.a
                                        key={social.label}
                                        href={social.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                                        aria-label={social.label}
                                    >
                                        <social.icon className="h-4 w-4 text-muted-foreground" />
                                    </motion.a>
                                ))}
                            </div>
                        </div>

                        {/* Link Columns */}
                        {Object.entries(footerLinks).map(([title, links]) => (
                            <div key={title}>
                                <h3 className="text-sm font-semibold mb-4">{title}</h3>
                                <ul className="space-y-3">
                                    {links.map((link) => (
                                        <li key={link.label}>
                                            <Link
                                                href={link.href}
                                                target={link.external ? '_blank' : undefined}
                                                rel={link.external ? 'noopener noreferrer' : undefined}
                                                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                {link.label}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="py-6 border-t border-border/50">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-sm text-muted-foreground">
                            © {new Date().getFullYear()} ThingBase. Open source under MIT License.
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-2">
                                Made with ❤️ for the IoT community
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
