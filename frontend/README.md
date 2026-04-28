# 🎰 NFT Lottery DApp - Frontend

<div align="center">

![React](https://img.shields.io/badge/React-19.1.1-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue)
![Vite](https://img.shields.io/badge/Vite-7.1.7-purple)
![Stellar](https://img.shields.io/badge/Stellar-Soroban-blue)

**A modern, responsive web interface for the NFT Lottery smart contract on Stellar Soroban**

[🌐 Live Demo](https://soroban-nft-lottery.vercel.app/) • [Contract README](../README.md) • [Documentation](#-features)

</div>

---

## 📖 Overview

This is the frontend application for the NFT Lottery DApp, built with React, TypeScript, and Vite. It provides a user-friendly interface for interacting with the Stellar Soroban smart contract, allowing users to:

- View all active and completed lotteries
- Purchase lottery tickets using Freighter wallet
- Create new lotteries (admin only)
- Draw winners (admin only)
- View their ticket history
- See winning status with visual indicators

## 🌐 Live Demo

The frontend is deployed and available at:

**👉 [https://soroban-nft-lottery.vercel.app/](https://soroban-nft-lottery.vercel.app/)**

## ✨ Features

### 🎯 User Features

- **Wallet Integration**: Connect using Freighter wallet extension
- **Lottery Browsing**: View all lotteries with NFT prize details, rarity, and ticket information
- **Ticket Purchase**: Buy multiple tickets with a single transaction
- **Ticket History**: View all your tickets for any lottery
- **Winner Display**: See who won each lottery with special highlighting for your wins
- **Price Display**: Smart price formatting (XLM or stroops based on value)
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices

### 🔐 Admin Features

- **Create Lottery**: Set up new lotteries with custom NFT prizes, prices, and ticket limits
- **Draw Winner**: Randomly select and announce winners for active lotteries
- **Admin Protection**: Only admin wallet can access admin features

### 🎨 UI/UX Features

- **Visual Indicators**: Special styling for lotteries you've won (golden border, star icon)
- **Real-time Updates**: Refresh lottery data with a single click
- **Sold Out Status**: Clear indication when lotteries are fully sold
- **Loading States**: Visual feedback during transaction processing
- **Error Handling**: User-friendly error messages for failed transactions
- **Toggleable Views**: Expandable ticket lists for better organization

## 🛠️ Tech Stack

- **React 19.1.1**: Modern UI library
- **TypeScript 5.9.3**: Type-safe development
- **Vite 7.1.7**: Fast build tool and dev server
- **@stellar/stellar-sdk 14.3.0**: Stellar SDK for contract interaction
- **@stellar/freighter-api 5.0.0**: Freighter wallet integration
- **CSS3**: Custom styling with modern features (Grid, Flexbox, Animations)

## 📦 Installation

### Prerequisites

1. **Node.js** (v16 or higher)
2. **pnpm** (or npm/yarn)
3. **Freighter Wallet** browser extension
   - [Chrome](https://chrome.google.com/webstore/detail/freighter/bcacfldlkkdogcmkkibnjlakofdplcbk)
   - [Firefox](https://addons.mozilla.org/en-US/firefox/addon/freighter/)

### Setup Steps

1. **Clone the repository** (if not already done):

```bash
git clone <your-repo-url>
cd soroban-nft-lottery
```

2. **Navigate to frontend directory**:

```bash
cd frontend
```

3. **Install dependencies**:

```bash
# Using pnpm (recommended)
pnpm install

# Or using npm
npm install --ignore-scripts @stellar/stellar-sdk
npm install

# Or using yarn
yarn install --ignore-scripts @stellar/stellar-sdk
yarn install
```

**Note**: The `--ignore-scripts` flag may be needed for `@stellar/stellar-sdk` to avoid build errors during installation.

4. **Configure environment variables** (optional):

Create a `.env` file in the `frontend` directory:

```env
VITE_CONTRACT_ID=CCU3FXQCJZ7HRUGWC6TJRZUJ4HVTHZW4LRYR7FILPA7GRBNI7GHHDWPC
VITE_ADMIN_ADDRESS=GB7UYMD3K7CLHC374ZRZDAR5ORC55P7BIFTSZZT426GS6OQHVFP5G3XG
```

If not provided, the app uses the default values from the contract configuration.

5. **Start development server**:

```bash
pnpm dev
# or
npm run dev
# or
yarn dev
```

The app will be available at `http://localhost:5173` (or the port shown in the terminal).

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the `frontend` directory to customize the configuration:

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_CONTRACT_ID` | Stellar Soroban contract ID | `CCU3FXQCJZ7HRUGWC6TJRZUJ4HVTHZW4LRYR7FILPA7GRBNI7GHHDWPC` |
| `VITE_ADMIN_ADDRESS` | Admin wallet address (for admin features) | `GB7UYMD3K7CLHC374ZRZDAR5ORC55P7BIFTSZZT426GS6OQHVFP5G3XG` |

### Network Configuration

The frontend is configured to use **Stellar Testnet** by default:

- **RPC URL**: `https://soroban-testnet.stellar.org`
- **Network Passphrase**: `Test SDF Network ; September 2015`

To change the network, modify the constants in `src/utils/contract.ts`.

## 🚀 Development

### Available Scripts

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Run linter
pnpm lint
```

### Project Structure

```
frontend/
├── src/
│   ├── App.tsx              # Main application component
│   ├── App.css              # Application styles
│   ├── main.tsx             # Application entry point
│   ├── index.css            # Global styles
│   ├── hooks/
│   │   └── useWallet.ts     # Wallet connection hook
│   └── utils/
│       └── contract.ts      # Contract interaction utilities
├── public/                  # Static assets
├── dist/                    # Production build output
├── package.json             # Dependencies and scripts
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript configuration
└── README.md                # This file
```

### Key Components

- **`App.tsx`**: Main component handling lottery display, forms, and user interactions
- **`useWallet.ts`**: Custom hook for Freighter wallet connection and transaction signing
- **`contract.ts`**: Utility functions for reading from and writing to the smart contract

## 📱 Usage Guide

### For Users

1. **Connect Wallet**:
   - Click "Connect Wallet" button
   - Approve connection in Freighter popup
   - Select your account if prompted

2. **View Lotteries**:
   - Browse all available lotteries on the main page
   - Each card shows NFT details, ticket price, and availability

3. **Buy Tickets**:
   - Click "🎫 Buy Tickets" on an active lottery
   - Enter number of tickets
   - Confirm transaction in Freighter
   - Wait for confirmation

4. **View Your Tickets**:
   - Click "🎟️ My Tickets" on any lottery
   - See all your ticket numbers for that lottery

5. **Check Winners**:
   - Completed lotteries show the winner's address
   - If you won, the card will have a golden border and star icon

### For Admins

1. **Create Lottery**:
   - Click "➕ Create Lottery" (only visible to admin)
   - Fill in ticket price, max tickets, NFT name, image URL, and rarity
   - Confirm transaction in Freighter

2. **Draw Winner**:
   - Click "🎲 Draw Winner" on an active lottery (only visible to admin)
   - Confirm transaction in Freighter
   - Winner will be randomly selected and displayed

## 🚢 Deployment

### Build for Production

```bash
pnpm build
```

This creates an optimized production build in the `dist/` directory.

### Deploy to Vercel

The frontend is currently deployed on Vercel. To deploy:

1. **Install Vercel CLI** (optional):

```bash
npm i -g vercel
```

2. **Deploy**:

```bash
cd frontend
vercel
```

Or connect your GitHub repository to Vercel for automatic deployments.

### Deploy to Other Platforms

The `dist/` folder contains a static site that can be deployed to:

- **Netlify**: Drag and drop the `dist` folder or connect via Git
- **GitHub Pages**: Use GitHub Actions to deploy on push
- **Cloudflare Pages**: Connect repository for automatic deployments
- **Any static hosting**: Upload `dist/` contents to your hosting provider

### Environment Variables in Production

Set environment variables in your hosting platform's dashboard:

- `VITE_CONTRACT_ID`: Your contract ID
- `VITE_ADMIN_ADDRESS`: Admin wallet address

**Note**: Vite requires the `VITE_` prefix for environment variables to be exposed to the client.

## 🐛 Troubleshooting

### Common Issues

#### 1. "Freighter not detected"

**Solution**: 
- Ensure Freighter extension is installed
- Refresh the page
- Check that Freighter is unlocked

#### 2. "Transaction simulation failed"

**Possible causes**:
- Insufficient token balance
- Contract not initialized
- Invalid parameters

**Solution**: Check your wallet balance and ensure the contract is properly initialized.

#### 3. "Unauthorized" error when creating lottery

**Solution**: Ensure you're connected with the admin wallet address. Check `ADMIN_ADDRESS` in the configuration.

#### 4. Build errors with `@stellar/stellar-sdk`

**Solution**: Install with `--ignore-scripts` flag:

```bash
npm install --ignore-scripts @stellar/stellar-sdk
npm install
```

#### 5. Wallet connection issues

**Solution**:
- Restart Freighter extension
- Clear browser cache
- Ensure you're on the correct network (Testnet)

### Debug Mode

Check the browser console (F12) for detailed error messages and transaction logs.

## 📚 API Reference

### Contract Methods

The frontend interacts with the following contract methods:

- `get_lottery_count()`: Get total number of lotteries
- `get_lottery(lottery_id)`: Get lottery details
- `get_user_tickets(user, lottery_id)`: Get user's tickets
- `create_lottery(...)`: Create new lottery (admin only)
- `buy_ticket(...)`: Purchase tickets
- `draw_winner(...)`: Draw winner (admin only)

See the main [README.md](../README.md) for detailed contract method documentation.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow React and TypeScript best practices
- Use meaningful component and variable names
- Add comments for complex logic
- Ensure responsive design works on mobile devices
- Test wallet interactions thoroughly
- Update documentation for UI/UX changes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## 🔗 Useful Links

- [Live Demo](https://soroban-nft-lottery.vercel.app/)
- [Main README](../README.md)
- [Stellar Documentation](https://developers.stellar.org/)
- [Soroban Documentation](https://soroban.stellar.org/)
- [Freighter Wallet](https://www.freighter.app/)
- [Vite Documentation](https://vite.dev/)
- [React Documentation](https://react.dev/)

## 🎉 Acknowledgments

- Built with [Stellar](https://www.stellar.org/) and [Soroban](https://soroban.stellar.org/)
- Wallet integration via [Freighter](https://www.freighter.app/)
- Powered by [Vite](https://vite.dev/) and [React](https://react.dev/)

---

<div align="center">

**Made with ❤️ for the Stellar Community**

**Happy Lottery Building! 🎰✨🚀**

</div>
