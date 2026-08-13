# Manual de Instalação: Data API Builder (DAB) no Windows Server

Este guia prático ensina como hospedar o **Data API Builder (DAB)** no mesmo servidor onde o seu banco de dados SQL Server está rodando, permitindo que ele rode de forma contínua e segura em ambiente de produção.

---

## 1. Pré-requisitos
Como o DAB é uma tecnologia criada pela Microsoft usando a plataforma .NET, o servidor precisará do .NET instalado.

1. Acesse remotamente o seu Windows Server.
2. Baixe e instale o **.NET 8 SDK** (ou superior) acessando o link oficial:
   [https://dotnet.microsoft.com/download/dotnet/8.0](https://dotnet.microsoft.com/download/dotnet/8.0)
3. Após instalar, abra o PowerShell ou Prompt de Comando (cmd) no servidor e digite para confirmar a instalação:
   ```cmd
   dotnet --version
   ```

---

## 2. Instalação do Data API Builder (DAB)
Com o .NET instalado, você poderá instalar a ferramenta CLI do DAB globalmente no servidor.

No PowerShell (como Administrador), rode o seguinte comando:
```cmd
dotnet tool install -g Microsoft.DataApiBuilder
```

Verifique se a instalação foi um sucesso rodando:
```cmd
dab --version
```

---

## 3. Preparando os Arquivos do Projeto
Agora precisamos colocar as configurações do Mantran no servidor.

1. Crie uma pasta no servidor para armazenar o projeto do DAB (exemplo: `C:\DataApiBuilder_Mantran`).
2. Copie o seu arquivo atual `dab-config.json` para dentro dessa pasta.
3. **Importante:** Edite o `dab-config.json` e verifique a sua *Connection String* no campo `"connection-string"`. 
   - Como o DAB estará rodando na mesma máquina do banco de dados, você pode usar `Server=localhost;` ou `Server=127.0.0.1;` na string de conexão do SQL Server.

---

## 4. Rodando o DAB em Produção
Você pode rodar o DAB simplesmente abrindo o CMD na pasta `C:\DataApiBuilder_Mantran` e digitando `dab start`. Porém, se o servidor reiniciar ou você fechar a tela preta, a API vai cair. 

Para produção, temos duas abordagens recomendadas: **Hospedar no IIS** ou **Rodar como Serviço do Windows**.

### Opção A: Hospedando via IIS (Internet Information Services)
Esta é a melhor opção caso o IIS já esteja instalado e recebendo requisições web no servidor.

1. Instale o **.NET Core Hosting Bundle** no servidor (no mesmo link de download do .NET 8).
2. Abra o Gerenciador do IIS (IIS Manager) e crie um **Novo Site** ou **Aplicativo**.
3. Aponte o caminho físico do site para a pasta `C:\DataApiBuilder_Mantran`.
4. Na porta do site (Bind), você pode colocar, por exemplo, a porta `5000` ou até configurar um domínio (ex: `api.mantran.com.br`).
5. O IIS detectará o executável gerenciado pela Microsoft e manterá a API no ar 24h/7, com reinício automático e gerenciamento de memória.

### Opção B: Criando um Serviço do Windows com o NSSM
Se não quiser usar o IIS, você pode rodar o `dab start` como um serviço invisível em segundo plano do Windows usando uma ferramenta grátis chamada **NSSM (Non-Sucking Service Manager)**.

1. Baixe o NSSM no servidor: [http://nssm.cc/](http://nssm.cc/)
2. Pelo CMD, acesse a pasta do NSSM e rode:
   ```cmd
   nssm install DAB_Mantran
   ```
3. Uma interface gráfica se abrirá. Preencha:
   - **Path (Caminho):** Coloque o caminho para o executável do DAB. (Geralmente em `C:\Users\Administrador\.dotnet\tools\dab.exe`)
   - **Arguments:** `start`
   - **Directory:** `C:\DataApiBuilder_Mantran`
4. Clique em "Install service".
5. Abra o **Services.msc** (Serviços do Windows), encontre o `DAB_Mantran`, clique com o botão direito e dê **Iniciar**.
6. Pronto! A API subiu na porta 5000 (ou na porta definida no arquivo) e iniciará automaticamente junto com o servidor em todos os reboots.

---

## 5. Configurando o Frontend (React/Vite)
Depois que sua API estiver no ar rodando no servidor (ex: no IP público `http://189.155.XX.XX:5000` ou domínio `https://api.mantran.com.br`), volte ao código fonte do seu painel e edite o arquivo **`src/lib/api.ts`**:

**Troque as linhas:**
```typescript
const API_URL = 'http://localhost:5000/api';
const GRAPHQL_URL = 'http://localhost:5000/graphql';
```
**Para o IP/Domínio do seu servidor:**
```typescript
const API_URL = 'http://189.155.XX.XX:5000/api';
const GRAPHQL_URL = 'http://189.155.XX.XX:5000/graphql';
```

Faça o build (`npm run build`) e agora qualquer pessoa do mundo conseguirá acessar o sistema perfeitamente!
