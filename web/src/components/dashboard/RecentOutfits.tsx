"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useOutfits } from "@/lib/hooks/useOutfits";

export function RecentOutfits() {
  const { data, isPending } = useOutfits(1, 3);
  const outfits = data?.kombinler ?? [];

  if (isPending) {
    return (
      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="skeleton h-3 w-28 rounded" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="skeleton h-12 w-12 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3 w-3/4 rounded" />
              <div className="skeleton h-3 w-1/2 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold tracking-widest text-muted uppercase">Recent Outfits</p>
        <Link href="/outfits" className="flex items-center gap-1 text-[12px] text-gold hover:underline">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {outfits.length === 0 ? (
        <div className="py-6 text-center text-muted text-sm">
          <p>No outfits yet.</p>
          <Link href="/outfits" className="text-gold hover:underline text-[12px]">Generate your first</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {outfits.map((outfit) => (
            <div key={outfit._id} className="flex items-center gap-3">
              <div className="flex gap-1 flex-shrink-0">
                {outfit.kiyafetler.slice(0, 3).map((item) => (
                  <div key={item._id} className="relative h-10 w-10 rounded-lg overflow-hidden bg-white/5 ring-1 ring-white/10">
                    <Image src={item.resimUrl} alt={item.kategori} fill className="object-cover" sizes="40px" />
                  </div>
                ))}
                {outfit.kiyafetler.length > 3 && (
                  <div className="h-10 w-10 rounded-lg bg-white/5 ring-1 ring-white/10 flex items-center justify-center text-[11px] text-muted">
                    +{outfit.kiyafetler.length - 3}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate">{outfit.baslik}</p>
                <p className="text-[11px] text-muted truncate">{outfit.aiAciklama?.slice(0, 60)}…</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
