"use client";

import Image from "next/image";
import Link from "next/link";
import { Github, Mail } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

export default function DeveloperCard({
  developer,
}: {
  developer: {
    name: string;
    role: string;
    image: string;
    github?: string;
    email: string;
    color: string;
  };
}) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="group relative flex flex-col">
      <div className="relative w-full aspect-square overflow-hidden rounded-lg bg-[#171C1F]">
        <Image
          src={imageError ? "/placeholder-avatar.jpg" : developer.image}
          alt={developer.name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => setImageError(true)}
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#171C1F]/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute top-2 right-2 flex items-center gap-2">
            {developer.github && (
              <ContactIcon
                href={developer.github}
                icon={<Github className="w-4 h-4" />}
                color={developer.color}
                label="GitHub Profile"
              />
            )}
            <ContactIcon
              href={`mailto:${developer.email}`}
              icon={<Mail className="w-4 h-4" />}
              color={developer.color}
              label="Send Email"
            />
          </div>
        </div>
      </div>
      <div className="mt-2 space-y-0.5">
        <h3 className="font-clash text-sm text-white font-medium line-clamp-1">
          {developer.name}
        </h3>
        <p className="font-archivo text-xs" style={{ color: developer.color }}>
          {developer.role}
        </p>
      </div>
    </div>
  );
}

export function ButtonIcon()  {
  return (
    <Button variant="outline" size="icon">
      <ChevronRight />
    </Button>
  )
}






function ContactIcon({
  href,
  icon,
  color,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  color: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="p-1.5  rounded-full transition-colors duration-200 flex items-center justify-center"
      style={{
        backgroundColor: color,
      }}
      aria-label={label}
    >
      <div className="text-white">{icon}</div>
    </Link>
  );
}