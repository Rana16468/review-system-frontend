// import { createContext, useContext, useState, ReactNode } from 'react';
// import { useRouter } from 'next/navigation'; // অথবা 'next/router' আপনার প্রজেক্ট অনুযায়ী
// import { TOKEN_NAME } from '../utility/authToken';

// type AuthContextType = {
//   token: string | null;
//   login: (token: string) => void;
//   logout: () => void;
// };

// export const AuthContext = createContext<AuthContextType>({
//   token: null,
//   login: () => {},
//   logout: () => {},
// });

// export function AuthProvider({ children }: { children: ReactNode }) {
//   const [token, setToken] = useState<string | null>(null);
//   const router = useRouter();

//   const login = (newToken: string) => {
//     setToken(newToken);
//     localStorage.setItem('token', newToken);
//     // মিডলওয়্যারে ব্যবহারের জন্য কুকিতেও টোকেন সেভ করে দেওয়া ভালো:
//     document.cookie = `token=${newToken}; path=/; max-age=86400; SameSite=Lax`;
//   };

//   const logout = () => {
//     setToken(null);
//     localStorage.removeItem(TOKEN_NAME);
//     localStorage.removeItem('token');
//     // কুকি থেকেও টোকেন রিমুভ করা:
//     document.cookie = 'token=; path=/; max-age=0';
//     router.push('/signup');
//   };

//   return (
//     <AuthContext.Provider value={{ token, login, logout }}>
//       {children}
//     </AuthContext.Provider>
//   );
// }

// export const useAuth = () => useContext(AuthContext);