"use client";

export default function VideoBackground() {
  return (
    <div className="absolute inset-0 z-0">
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="w-full h-full object-cover"
      >
        {/* Public domain space video — replace with your own */}
        <source
          src="https://assets.mixkit.co/videos/32982/32982-720.mp4"
          type="video/mp4"
        />
      </video>

      {/* Dark overlay — avatar text readable rahega */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(2,4,9,0.3) 0%, rgba(2,4,9,0.5) 100%)",
        }}
      />
    </div>
  );
}
