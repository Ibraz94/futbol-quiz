"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import Image from "next/image";

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
    const [currentIndex, setCurrentIndex] = useState(1); // Start with middle card active

    const nextTestimonial = () => {
        setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    };

    const prevTestimonial = () => {
        setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
    };

    const renderStars = (rating: number) => {
        return Array.from({ length: 5 }, (_, index) => (
            <span
                key={index}
                className={`text-[26px] ${index < rating ? "text-[#FDB022]" : "text-gray-400"
                    }`}
            >
                ★
            </span>
        ));
    };

    const getCardStyle = (index: number) => {
        if (index === currentIndex) {
            return "bg-accent border-2 border-white/20 text-white scale-105 z-10";
        }
        return "bg-[#2F265380] border-2 border-white/20 scale-95 opacity-70";
    };

    return (
        <section className="relative overflow-hidden py-44">
            {/* Background decorative elements */}
            <Image src="/circle-2.png" alt="circle-2" width={160} height={100} className="absolute top-36 -right-16" />
            <Image src="/box-2.png" alt="box-2" width={22} height={10} className="absolute top-36 right-32" />
            <Image src="/box-1.png" alt="box-1" width={28} height={10} className="absolute top-64 left-8" />
            <Image src="/circle-blue.png" alt="circle-blue" width={16} height={10} className="absolute top-52 left-0" />
            <div className="w-[480px] h-[380px] rounded-full bg-gradient-to-r from-[#3707FC] to-[#a442c5] blur-[250px] absolute top-64 -left-64"></div>
            <div className="absolute inset-0  from-blue-900/20 via-transparent to-transparent"></div>
            <div className="container mx-auto px-6 relative z-10">
                {/* Header */}
                <div className="text-center mb-16">
                    <p className="text-accent text-sm font-semibold tracking-wide uppercase mb-3">
                        OUR TESTIMONIAL
                    </p>
                    <h2 className="text-4xl md:text-[50px] font-semibold text-white mb-4">
                        What Our Client Saying
                    </h2>
                </div>

                {/* Testimonials Container */}
                <div className="relative mx-auto">
                    {/* Navigation Buttons */}
                    <button
                        onClick={prevTestimonial}
                        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-20 w-12 h-12 border hover:bg-accent hover:border-none rounded-full flex items-center justify-center text-white transition-all duration-300 hover:scale-110"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>

                    <button
                        onClick={nextTestimonial}
                        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-20 w-12 h-12 border hover:bg-accent hover:border-none rounded-full flex items-center justify-center text-white transition-all duration-300 hover:scale-110"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>

                    {/* Testimonial Cards */}
                    <div className="flex justify-center items-center gap-8 px-16">
                        {testimonials.map((testimonial, index) => (
                            <div
                                key={testimonial.id}
                                className={`
                                relative w-[370px] h-[270px] rounded-2xl p-4 transition-all duration-500 ease-in-out cursor-pointer
                               ${getCardStyle(index)}`}
                                onClick={() => setCurrentIndex(index)}
                            >
                                {/* Star Rating */}
                                <div className="flex gap-1">
                                    {renderStars(testimonial.rating)}
                                </div>

                                {/* Content */}
                                <p className="text-white/90 text-base leading-relaxed mb-4 line-clamp-4">
                                    {testimonial.content}
                                </p>

                                {/* Profile */}
                                <div className="flex items-center gap-4 mt-auto">
                                    <div>
                                        <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white">
                                            <Image
                                                src={testimonial.image}
                                                alt={testimonial.name}
                                                width={56}
                                                height={56}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>

                                    </div>
                                    <div className="flex gap-10 items-center">
                                        <div>
                                            <h4 className="text-white font-medium text-[18px]">
                                                {testimonial.name}
                                            </h4>
                                            <p className="text-white/70 text-sm">
                                                {testimonial.title}
                                            </p>
                                        </div>
                                        <Image src="/double-quotes.svg"
                                            alt="quote"
                                            width={80}
                                            height={80}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Testimonials; 