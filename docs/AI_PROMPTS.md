## AI Tools Utilized

Throughout the development process, I leveraged a combination of advanced AI tools to assist with code generation, debugging, architectural decisions, and styling. The primary tools used include **Grok**, **ChatGPT**, **Remix IDE Assistant**, and **GitHub Copilot**.

### Tool Selection Rationale

#### **Grok**

Grok proved to be highly effective in resolving programming issues and suggesting viable solutions. Its generous query limits and **workspace feature**—which organizes prompts and associates uploaded files with specific queries—made it an ideal choice for development support.

However, Grok is not without limitations. It occasionally produces incorrect or redundant code, including invalid imports. Moreover, it tends to generate unnecessarily verbose responses. Therefore, it is crucial to cross-reference its output with official documentation and additional sources.

#### **ChatGPT**

ChatGPT excels at generating concise, well-structured responses. Although not always optimal for writing complete code implementations, it is highly effective for code formatting, logical structuring, and general research queries.

#### **Remix IDE Assistant**

This tool is specifically designed to analyze smart contract code, identify potential vulnerabilities, and enhance security. While it provides useful insights, the generated code is often generic and may not be tailored to project-specific requirements.

#### **GitHub Copilot**

GitHub Copilot integrates seamlessly with Visual Studio Code, offering context-aware code suggestions. It understands the project structure and can provide accurate suggestions across multiple files, making it an efficient tool for real-time development.

---

## Framework Selection

At the project's inception, I evaluated multiple frontend frameworks based on my background in **Node.js**, **React**, **React Native**, and **Laravel**. To aid in this decision, I consulted Grok for a comparative analysis.

**React** emerged as the preferred framework due to its modularity and ease of integration with tools like Hardhat. However, I later discovered that **Next.js** is the modern evolution of React for full-stack applications. As a result, I chose to proceed with **Next.js** for this project.

---

## Styling Assistance

To handle styling, I used Grok to generate CSS based on a specified color palette. The prompts typically followed this structure:

> “Create a CSS theme using color X as the primary color and Y as the secondary.”

Since Tailwind CSS was used, Grok conveniently applied Tailwind classes by default.

---

## Component Design

Several UI components were generated using Grok to save development time. These include:

1. `PrimaryButton`
2. `UnderlineButton`
3. `Card`
4. `HomePage`
5. `OrderPage` (including `OrdersList` and `OrderItem`)

For example, the component design process involved sending Grok a base component and a related class. Below is a simplified version of this workflow:

### Base React Component Prompt

```jsx
import React from 'react';
export default function OrderItem({ order }) {
  return <div>{order.transactionHash}</div>;
}
```

### Associated Data Model

```js
export default class CommittedOrders {
  constructor({ energyRequested, transactionHash, uid, ethereumAddress, nonce, createdAt }) {
    // Validation logic...
  }
  // Getters and toFirebase()...
}
```

### Final Component Generated

```jsx
import CommittedOrders from "@/models/committedOrders";
import React from "react";

export default function OrderItem({ order }) {
  if (!(order instanceof CommittedOrders)) {
    console.error("Invalid order prop", order);
    return <div>Error: Invalid order data</div>;
  }

  return (
    <div className="border rounded-lg p-4 mb-4 shadow-sm bg-white">
      <h3 className="text-lg font-semibold mb-2">Order Details</h3>
      <div className="grid grid-cols-1 gap-2">
        <p><span className="font-medium">Energy Requested:</span> {order.energyRequested} kWh</p>
        <p><span className="font-medium">Transaction Hash:</span> <span className="font-mono break-all">{order.transactionHash}</span></p>
        <p><span className="font-medium">User ID:</span> <span className="font-mono">{order.uid}</span></p>
        <p><span className="font-medium">Ethereum Address:</span> <span className="font-mono break-all">{order.ethereumAddress}</span></p>
        <p><span className="font-medium">Nonce:</span> {order.nonce || "N/A"}</p>
        <p><span className="font-medium">Created At:</span> {order.createdAt.toLocaleString()}</p>
      </div>
    </div>
  );
}
```

> ⚠️ **Note**: Since AI tools are unaware of the actual project file structure, it is essential to provide skeletons with accurate imports to ensure coherence.

---

## Code Refactoring

Whenever repetitive code was identified, I used Grok to refactor it. This involved either:

* Sending the repetitive code and asking for refactoring suggestions, or
* Creating skeletons of utility functions and asking Grok to fill in the logic, while updating references throughout the codebase.

This practice significantly improved maintainability and readability.

> ⚠️ **AI Consistency Warning**: AI-generated code may lack consistency. Even when both components are generated by the same tool, discrepancies can arise. **Thorough verification is critical**.

---

## Logic Implementation

For implementing complex logic, I found the combination of ChatGPT and Grok particularly effective. ChatGPT’s strength in reasoning and Grok’s coding capabilities complemented each other well.

Prompts were often structured with commented function skeletons, such as:

```js
const sayHello = () => {
  // this function says hello
};
```

This approach yielded more accurate and efficient outputs. Additionally, including relevant helper functions in the prompt improved the quality of the result by preventing unnecessary re-implementation.

---

## Architectural Decisions

I consulted ChatGPT for guidance on architectural decisions, such as whether to build a separate admin panel or integrate it into the existing application. By prompting for detailed explanations and comparisons, I was able to make well-informed, context-aware decisions.

> ⚠️ **Note**: Always specify any limitations or platform constraints (e.g., library compatibility with SSR or client-only environments). AI may overlook such details if not explicitly stated.

---

## Debugging and Error Resolution

AI tools often make incorrect assumptions. When encountering errors, I provided the **exact error message** along with the relevant **code snippet** to Grok or ChatGPT. This significantly improved the quality and accuracy of the suggested fixes.

---

## Component Integration

When integrating components, I found that supplying both the target component and the one to be integrated into it yielded the best results. This context helps AI tools generate cleaner and more functional code.
