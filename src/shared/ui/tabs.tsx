import React, { useState, createContext, useContext } from "react";

interface TabsProps {
  defaultValue: string;
  children: React.ReactNode;
}

interface TabsListProps {
  children: React.ReactNode;
}

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
}

const TabsContext = createContext<{
  activeTab: string;
  setActiveTab: (value: string) => void;
}>({ activeTab: "", setActiveTab: () => {} });

export function Tabs({ defaultValue, children }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children }: TabsListProps) {
  return <div className="tabs-list">{children}</div>;
}

export function TabsTrigger({ value, children }: TabsTriggerProps) {
  const { activeTab, setActiveTab } = useContext(TabsContext);

  return (
    <button
      className={`tabs-trigger ${activeTab === value ? "tabs-trigger-active" : ""}`}
      onClick={() => setActiveTab(value)}
      type="button"
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children }: TabsContentProps) {
  const { activeTab } = useContext(TabsContext);

  if (activeTab !== value) {
    return null;
  }

  return <div className="tabs-content">{children}</div>;
}
