"use client";

import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { motion, useInView } from "framer-motion";

interface Testimonial {
    id: number;
    name: string;
    title: string;
    content: string;
    image: string;
    rating: number;
}

const testimonials: Testimonial[] = [
    {
        id: 1,
        name: "Phillip Levin",
        title: "CEO / Creative IT",
        content: "Lorem ipsum dolor sit amet, consecte tur adipiscing elit. Ultrices blandit pelle ntesque nibh arcu elementum odio justo. Rhoncus.",
        image: "/pillip.png",
        rating: 5,
    },
    {
        id: 2,
        name: "Lincoln Lipshutz",
        title: "CEO / Creative IT",
        content: "Lorem ipsum dolor sit amet, consecte tur adipiscing elit. Ultrices blandit pelle ntesque nibh arcu elementum odio justo. Rhoncus.",
        image: "/lincoln.png",
        rating: 5,
    },
    {
        id: 3,
        name: "Craig Siphron",
        title: "CEO / Creative IT",
        content: "Lorem ipsum dolor sit amet, consecte tur adipiscing elit. Ultrices blandit pelle ntesque nibh arcu elementum odio justo. Rhoncus.",
        image: "/craig.png",
        rating: 5,
    },
];

const Testimonials = () => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.3 });
    const [currentIndex, setCurrentIndex] = useState(1);

    // Show only first 3 testimonials
    const displayedTestimonials = testimonials.slice(0, 3);

    const nextTestimonial = () => {
        setCurrentIndex((prev) => (prev + 1) % displayedTestimonials.length);
    };

    const prevTestimonial = () => {
        setCurrentIndex((prev) => (prev - 1 + displayedTestimonials.length) % displayedTestimonials.length);
    };

    const renderStars = (rating: number) => {
        return Array.from({ length: 5 }, (_, index) => (
            <span
                key={index}
                className={`text-lg sm:text-xl lg:text-[26px] ${index < rating ? "text-[#FDB022]" : "text-gray-400"
                    }`}
            >
                ★
            </span>
        ));
    };

    const getCardStyle = (index: number) => {
        if (index === currentIndex) {
            return "md:bg-[#2F265380] md:hover:bg-accent bg-[#2F265380] border-2 border-white/20 scale-95 opacity-70";
        } else {
            return "md:bg-[#2F265380] bg-[#2F265380] border-2 border-white/20 scale-95 opacity-70";
        } 
    }

    const headingVariants = {
        hidden: { y: -100, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                delay: 0.3,
                duration: 0.8,
                ease: [0.4, 0, 0.2, 1]
            }
        }
    };

    const cardsContainerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                delay: 0.5,
                staggerChildren: 0.2,
                delayChildren: 0.2
            }
        }
    };

    const cardVariants = {
        hidden: { y: 100, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                duration: 0.8,
                ease: [0.4, 0, 0.2, 1]
            }
        }
    };

    return (
        <section className="relative overflow-hidden py-16 sm:py-24 lg:py-44">
            {/* Static Background Elements - Hidden on mobile for better performance */}
            <div className="absolute inset-0 hidden lg:block">
                <Image src="/circle-2.png" alt="circle-2" width={160} height={100} className="absolute top-36 -right-16" />
                <Image src="/Box-2.png" alt="box-2" width={22} height={10} className="absolute top-36 right-32" />
                <Image src="/box-1.png" alt="box-1" width={28} height={10} className="absolute top-64 left-8" />
                <Image src="/circle-blue.png" alt="circle-blue" width={16} height={10} className="absolute top-52 left-0" />
                <div className="w-[480px] h-[380px] rounded-full bg-gradient-to-r from-[#3707FC] to-[#a442c5] blur-[250px] absolute top-64 -left-64"></div>
                <div className="absolute inset-0 from-blue-900/20 via-transparent to-transparent"></div>
            </div>

            {/* Animated Content */}
            <div ref={ref} className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                {/* Header */}
                <motion.div 
                    className="text-center mb-8 sm:mb-12 lg:mb-16"
                    initial="hidden"
                    animate={isInView ? "visible" : "hidden"}
                    variants={headingVariants}
                >
                    <p className="text-accent text-xs sm:text-sm font-semibold tracking-wide uppercase mb-2 sm:mb-3">
                        OUR TESTIMONIAL
                    </p>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[50px] font-semibold text-white mb-4">
                        What Our Client Saying
                    </h2>
                </motion.div>

                {/* Testimonials Container */}
                <motion.div 
                    className="relative mx-auto max-w-7xl"
                    initial="hidden"
                    animate={isInView ? "visible" : "hidden"}
                    variants={cardsContainerVariants}
                >
                    {/* Testimonial Cards */}
                    {/* Mobile: Single card view */}
                    <div className="block md:hidden relative">
                        <motion.div
                            variants={cardVariants}
                            className="bg-[#2F265380] border-2 border-white/20 text-white rounded-2xl p-4 sm:p-6 mx-8 sm:mx-12"
                        >
                            {/* Star Rating */}
                            <div className="flex gap-1 mb-4">
                                {renderStars(displayedTestimonials[currentIndex].rating)}
                            </div>

                            {/* Content */}
                            <p className="text-white/90 text-sm sm:text-base leading-relaxed mb-6">
                                {displayedTestimonials[currentIndex].content}
                            </p>

                            {/* Profile */}
                            <div className="flex items-center gap-3 sm:gap-4">
                                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 border-white flex-shrink-0">
                                    <Image
                                        src={displayedTestimonials[currentIndex].image}
                                        alt={displayedTestimonials[currentIndex].name}
                                        width={56}
                                        height={56}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-white font-medium text-base sm:text-lg truncate">
                                        {displayedTestimonials[currentIndex].name}
                                    </h4>
                                    <p className="text-white/70 text-sm truncate">
                                        {displayedTestimonials[currentIndex].title}
                                    </p>
                                </div>
                                <div className="flex-shrink-0">
                                    <Image src="/double-quotes.svg"
                                        alt="quote"
                                        width={40}
                                        height={40}
                                        className="sm:w-16 sm:h-16"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Desktop: Multi-card view */}
                    <div className="hidden md:block relative">
                        {/* Navigation Buttons for Desktop */}
                        <motion.button
                            initial={{ opacity: 0, x: -20 }}
                            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                            transition={{ delay: 1.2, duration: 0.5 }}
                            onClick={prevTestimonial}
                            className="absolute left-0 lg:-left-4 top-[110px] -translate-y-1/2 z-20 w-12 h-12 border hover:bg-accent hover:border-none rounded-full flex items-center justify-center text-white transition-all duration-300 hover:scale-110"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </motion.button>

                        <motion.button
                            initial={{ opacity: 0, x: 20 }}
                            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
                            transition={{ delay: 1.2, duration: 0.5 }}
                            onClick={nextTestimonial}
                            className="absolute right-0 lg:-right-4 top-[110px] -translate-y-1/2 z-20 w-12 h-12 border hover:bg-accent hover:border-none rounded-full flex items-center justify-center text-white transition-all duration-300 hover:scale-110"
                        >
                            <ChevronRight className="w-6 h-6" />
                        </motion.button>

                        <div className="flex justify-center items-center gap-4 lg:gap-8 px-4 lg:px-16">
                            {displayedTestimonials.map((testimonial, index) => (
                                <motion.div
                                    key={testimonial.id}
                                    variants={cardVariants}
                                    className={`
                                    relative w-full max-w-[280px] lg:max-w-[370px] h-[240px] lg:h-[270px] rounded-2xl p-3 lg:p-4 transition-all duration-500 ease-in-out cursor-pointer
                                   ${getCardStyle(index)}`}
                                    onMouseEnter={() => setCurrentIndex(index)}
                                >
                                    {/* Star Rating */}
                                    <div className="flex gap-1 mb-3">
                                        {renderStars(testimonial.rating)}
                                    </div>

                                    {/* Content */}
                                    <p className="text-white/90 text-sm lg:text-base leading-relaxed mb-4 line-clamp-3 lg:line-clamp-4">
                                        {testimonial.content}
                                    </p>

                                    {/* Profile */}
                                    <div className="flex items-center gap-3 lg:gap-4 mt-auto">
                                        <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full overflow-hidden border-2 border-white flex-shrink-0">
                                            <Image
                                                src={testimonial.image}
                                                alt={testimonial.name}
                                                width={56}
                                                height={56}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="flex gap-2 lg:gap-10 items-center flex-1 min-w-0">
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-white font-medium text-sm lg:text-[18px] truncate">
                                                    {testimonial.name}
                                                </h4>
                                                <p className="text-white/70 text-xs lg:text-sm truncate">
                                                    {testimonial.title}
                                                </p>
                                            </div>
                                            <div className="flex-shrink-0">
                                                <Image src="/double-quotes.svg"
                                                    alt="quote"
                                                    width={60}
                                                    height={60}
                                                    className="lg:w-20 lg:h-20"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Dots Indicator for Mobile */}
                    <div className="flex justify-center gap-2 mt-6 md:hidden">
                        {displayedTestimonials.map((_, index) => (
                            <div
                                key={index}
                                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                                    index === currentIndex 
                                        ? 'bg-white scale-110' 
                                        : 'bg-white/30'
                                }`}
                            />
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default Testimonials; 