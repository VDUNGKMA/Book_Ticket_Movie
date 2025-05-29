import React, { createContext, useContext, useState } from "react";

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  image?: string;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoggedIn: boolean;
  setIsLoggedIn: (isLoggedIn: boolean) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: React.ReactNode;
  initialUser?: User | null;
  initialLoggedIn?: boolean;
}

export const UserProvider: React.FC<UserProviderProps> = ({
  children,
  initialUser = null,
  initialLoggedIn = false,
}) => {
  const [user, setUser] = useState<User | null>(initialUser);
  const [isLoggedIn, setIsLoggedIn] = useState(initialLoggedIn);

  return (
    <UserContext.Provider value={{ user, setUser, isLoggedIn, setIsLoggedIn }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUserContext must be used within a UserProvider");
  }
  return context;
};
