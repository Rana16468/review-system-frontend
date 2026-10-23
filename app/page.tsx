import Link from "next/link";

const steps = [
  {
    title: "অ্যাসাইনমেন্ট তৈরি করুন",
    desc: "টাইটেল, নির্দেশনা আর ডেডলাইন দিয়ে মিনিটেই নতুন অ্যাসাইনমেন্ট বানান।",
    icon: <path d="M12 5v14M5 12h14" />,
  },
  {
    title: "স্টুডেন্টদের সাথে শেয়ার করুন",
    desc: "এক ক্লিকেই পুরো ক্লাসের কাছে অ্যাসাইনমেন্ট পৌঁছে যাবে, আলাদা করে পাঠাতে হবে না।",
    icon: (
      <>
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
      </>
    ),
  },
  {
    title: "সাবমিশন জমা নিন",
    desc: "স্টুডেন্টরা নিজের অ্যাকাউন্ট থেকে ফাইল আপলোড করবে, আপনি এক জায়গায় সব দেখবেন।",
    icon: (
      <>
        <path d="M12 16V4M7 9l5-5 5 5" />
        <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
      </>
    ),
  },
];

const features = [
  {
    title: "ডেডলাইন ট্র্যাকিং",
    desc: "কোন অ্যাসাইনমেন্টের সময় কখন শেষ, এক নজরে দেখা যায়।",
  },
  {
    title: "সহজ ফাইল আপলোড",
    desc: "PDF, ডক বা ছবি, স্টুডেন্ট সহজেই জমা দিতে পারে।",
  },
  {
    title: "আলাদা ড্যাশবোর্ড",
    desc: "টিচার ও স্টুডেন্ট, দুজনের জন্য আলাদা ও পরিষ্কার ভিউ।",
  },
  {
    title: "নিরাপদ লগইন",
    desc: "রোল অনুযায়ী অ্যাক্সেস, তাই যার যা দরকার সে শুধু সেটাই দেখে।",
  },
];

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true">
      {children}
    </svg>
  );
}

export default function Home() {
  return (
    <>
      <main className="overflow-hidden bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        {/* ================= HERO ================= */}
        <section className="relative isolate">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)]"
          />
          <div
            aria-hidden="true"
            className="absolute -top-24 left-1/2 -z-10 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-400/30 via-blue-400/30 to-violet-400/30 blur-3xl"
          />

          <div className="container mx-auto grid items-center gap-14 px-4 pb-20 pt-6 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                টিচার ও স্টুডেন্টদের জন্য সহজ প্ল্যাটফর্ম
              </span>

              <h1 className="mt-6 text-4xl font-extrabold leading-[1.15] tracking-tight sm:text-5xl lg:text-6xl">
                অ্যাসাইনমেন্ট দেওয়া আর জমা নেওয়া,{" "}
                <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600 bg-clip-text text-transparent">
                  হোক ঝামেলাহীন
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600 dark:text-slate-300">
                EduPortal-এ টিচাররা অ্যাসাইনমেন্ট তৈরি করে ক্লাসে শেয়ার করেন,
                আর স্টুডেন্টরা নিজেদের কাজ সরাসরি আপলোড করে। কাগজ, মেসেজ বা
                ইমেইলের ভিড় ছাড়াই সবকিছু এক জায়গায়।
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href="/signup"
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
                  বিনামূল্যে শুরু করুন
                </Link>
                <Link
                  href="/signup"
                  className="rounded-xl border border-slate-200 bg-white px-7 py-3.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                  লগইন করুন
                </Link>
              </div>

              <div className="mt-10 flex items-center gap-6 text-sm text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span> ফ্রি অ্যাকাউন্ট
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span> সহজ সেটআপ
                </span>
                <span className="hidden items-center gap-2 sm:flex">
                  <span className="text-emerald-500">✓</span> মোবাইল ফ্রেন্ডলি
                </span>
              </div>
            </div>

            {/* Mock UI preview */}
            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <div
                aria-hidden="true"
                className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-indigo-500/20 to-violet-500/20 blur-2xl"
              />

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      নতুন অ্যাসাইনমেন্ট
                    </p>
                    <h3 className="mt-1 text-lg font-bold">
                      Database Design Report
                    </h3>
                  </div>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30">
                    ডেডলাইন: ৩ দিন
                  </span>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  একটি লাইব্রেরি ম্যানেজমেন্ট সিস্টেমের ER ডায়াগ্রাম তৈরি করে
                  PDF আকারে জমা দিন।
                </p>

                <div className="mt-5 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/60 p-5 text-center dark:border-indigo-500/30 dark:bg-indigo-500/5">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                    <Icon>
                      <path d="M12 16V4M7 9l5-5 5 5" />
                      <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
                    </Icon>
                  </div>
                  <p className="mt-2 text-sm font-medium">
                    ফাইল এখানে আপলোড করুন
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    PDF, DOC, PNG · সর্বোচ্চ ১০ MB
                  </p>
                </div>

                <div className="mt-5 space-y-2.5">
                  {[
                    { n: "রাহেলা", s: "জমা দিয়েছে", c: "emerald" },
                    { n: "করিম", s: "জমা দিয়েছে", c: "emerald" },
                    { n: "সুমি", s: "অপেক্ষমাণ", c: "slate" },
                  ].map((r) => (
                    <div
                      key={r.n}
                      className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-bold text-white">
                          {r.n.charAt(0)}
                        </span>
                        <span className="text-sm font-medium">{r.n}</span>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          r.c === "emerald"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                            : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                        }`}>
                        {r.s}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* floating chip */}
              <div className="absolute -bottom-5 -left-3 hidden items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl sm:flex dark:border-slate-800 dark:bg-slate-900">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
                  <Icon>
                    <path d="m5 12 5 5L20 7" />
                  </Icon>
                </span>
                <div>
                  <p className="text-sm font-bold">২৮/৩০ জমা পড়েছে</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    আজকের আপডেট
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= HOW IT WORKS ================= */}
        <section className="bg-slate-50 py-20 dark:bg-slate-900/50">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                কিভাবে কাজ করে
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                মাত্র তিনটি ধাপেই সম্পূর্ণ
              </h2>
              <p className="mt-4 text-slate-600 dark:text-slate-300">
                জটিল কিছু শেখার দরকার নেই। শুরু থেকে শেষ পর্যন্ত পুরো প্রক্রিয়া
                সহজ।
              </p>
            </div>

            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {steps.map((s, i) => (
                <div
                  key={s.title}
                  className="group relative rounded-2xl border border-slate-200 bg-white p-7 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 dark:border-slate-800 dark:bg-slate-900">
                  <span className="absolute right-6 top-5 text-5xl font-black text-slate-100 dark:text-slate-800">
                    {i + 1}
                  </span>
                  <span className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-500 text-white shadow-md shadow-indigo-500/30 transition-transform group-hover:rotate-6">
                    <Icon>{s.icon}</Icon>
                  </span>
                  <h3 className="relative mt-5 text-lg font-bold">{s.title}</h3>
                  <p className="relative mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================= ROLES ================= */}
        <section className="py-20">
          <div className="container mx-auto grid gap-6 px-4 md:grid-cols-2">
            <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 p-9 text-white shadow-xl shadow-indigo-500/20">
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                টিচারদের জন্য
              </span>
              <h3 className="mt-5 text-2xl font-extrabold">
                ক্লাস সামলান আরও গুছিয়ে
              </h3>
              <ul className="mt-5 space-y-3 text-sm text-indigo-50">
                <li className="flex gap-3">
                  <span>✓</span> অ্যাসাইনমেন্ট তৈরি ও ডেডলাইন ঠিক করুন
                </li>
                <li className="flex gap-3">
                  <span>✓</span> কে জমা দিয়েছে আর কে বাকি, সহজে দেখুন
                </li>
                <li className="flex gap-3">
                  <span>✓</span> সব সাবমিশন এক জায়গা থেকে ডাউনলোড করুন
                </li>
              </ul>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-9 shadow-xl shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900">
              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 ring-1 ring-inset ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30">
                স্টুডেন্টদের জন্য
              </span>
              <h3 className="mt-5 text-2xl font-extrabold">
                কাজ জমা দিন নিশ্চিন্তে
              </h3>
              <ul className="mt-5 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <li className="flex gap-3">
                  <span className="text-emerald-500">✓</span> সব অ্যাসাইনমেন্ট
                  একটা ড্যাশবোর্ডে
                </li>
                <li className="flex gap-3">
                  <span className="text-emerald-500">✓</span> ডেডলাইনের আগেই
                  রিমাইন্ডার চোখে পড়বে
                </li>
                <li className="flex gap-3">
                  <span className="text-emerald-500">✓</span> ফোন থেকেও সহজে
                  ফাইল আপলোড
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ================= FEATURES ================= */}
        <section className="pb-20">
          <div className="container mx-auto px-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="rounded-2xl border border-slate-200 p-6 transition-colors hover:border-indigo-300 dark:border-slate-800 dark:hover:border-indigo-500/50">
                  <h4 className="font-bold">{f.title}</h4>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================= CTA ================= */}
        <section className="px-4 pb-20">
          <div className="container relative mx-auto overflow-hidden rounded-3xl bg-slate-900 px-6 py-16 text-center dark:bg-slate-800">
            <div
              aria-hidden="true"
              className="absolute -top-20 left-1/2 h-64 w-[500px] -translate-x-1/2 rounded-full bg-indigo-500/40 blur-3xl"
            />
            <h2 className="relative text-3xl font-extrabold text-white sm:text-4xl">
              আজই শুরু করুন আপনার ক্লাসরুম
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-slate-300">
              অ্যাকাউন্ট খুলতে এক মিনিটও লাগবে না। টিচার বা স্টুডেন্ট, আপনার রোল
              বেছে নিয়ে এখনই যোগ দিন।
            </p>
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/signup"
                className="rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-slate-900 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900">
                Sign up করুন
              </Link>
              <Link
                href="/signup"
                className="rounded-xl border border-white/25 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900">
                Log in
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}