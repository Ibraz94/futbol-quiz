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
    image: "/api/placeholder/60/60",
    rating: 5,
  },
  {
    id: 2,
    name: "Lincoln Lipshutz",
    title: "CEO / Creative IT",
    content: "Lorem ipsum dolor sit amet, consecte tur adipiscing elit. Ultrices blandit pelle ntesque nibh arcu elementum odio justo. Rhoncus.",
    image: "/api/placeholder/60/60",
    rating: 5,
  },
  {
    id: 3,
    name: "Craig Siphron",
    title: "CEO / Creative IT",
    content: "Lorem ipsum dolor sit amet, consecte tur adipiscing elit. Ultrices blandit pelle ntesque nibh arcu elementum odio justo. Rhoncus.",
    image: "/api/placeholder/60/60",
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
        className={`text-xl ${
          index < rating ? "text-yellow-400" : "text-gray-400"
        }`}
      >
        ★
      </span>
    ));
  };

  const getCardStyle = (index: number) => {
    if (index === currentIndex) {
      return "bg-gradient-to-br from-blue-600 to-purple-700 scale-105 shadow-2xl z-10";
    }
    return "bg-gray-800/60 scale-95 opacity-70";
  };

  return (
    <section className="py-20 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent"></div>
      
      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-blue-400 text-sm font-semibold tracking-wide uppercase mb-3">
            OUR TESTIMONIAL
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            What Our Client Saying
          </h2>
        </div>

        {/* Testimonials Container */}
        <div className="relative max-w-6xl mx-auto">
          {/* Navigation Buttons */}
          <button
            onClick={prevTestimonial}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-20 w-12 h-12 bg-gray-700/50 hover:bg-gray-600/70 rounded-full flex items-center justify-center text-white transition-all duration-300 hover:scale-110"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={nextTestimonial}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-20 w-12 h-12 bg-gray-700/50 hover:bg-gray-600/70 rounded-full flex items-center justify-center text-white transition-all duration-300 hover:scale-110"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Testimonial Cards */}
          <div className="flex justify-center items-center gap-8 px-16">
            {testimonials.map((testimonial, index) => (
              <div
                key={testimonial.id}
                className={`
                  relative w-80 h-96 rounded-2xl p-8 transition-all duration-500 ease-in-out cursor-pointer
                  ${getCardStyle(index)}
                `}
                onClick={() => setCurrentIndex(index)}
              >
                {/* Quote decoration */}
                <div className="absolute top-6 right-6 opacity-20">
                  <Quote className="w-12 h-12 text-white" />
                </div>

                {/* Star Rating */}
                <div className="flex gap-1 mb-6">
                  {renderStars(testimonial.rating)}
                </div>

                {/* Content */}
                <p className="text-white/90 text-base leading-relaxed mb-8 line-clamp-4">
                  {testimonial.content}
                </p>

                {/* Profile */}
                <div className="flex items-center gap-4 mt-auto">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/20">
                      <Image
                        src={testimonial.image}
                        alt={testimonial.name}
                        width={56}
                        height={56}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold text-lg">
                      {testimonial.name}
                    </h4>
                    <p className="text-white/70 text-sm">
                      {testimonial.title}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-3 mt-12">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? "bg-blue-400 w-8"
                    : "bg-gray-600 hover:bg-gray-500"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials; 