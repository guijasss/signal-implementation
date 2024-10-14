import { DataSource } from "typeorm";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: "localhost",
  port: 5432,
  username: "postgres",
  password: "123456",
  database: "signal-app-db",
  synchronize: true,
  logging: true,
  entities: ["src/infra/typeorm/entities/*.ts"],
  migrations: ["src/infra/typeorm/migrations/*.ts"]
});

export const initializeDatabase = async () => {
  try {
    await AppDataSource.initialize();
    console.log("Conexão com banco de dados estabelecida!");
  } catch (error) {
    console.error("Erro ao conectar com o banco de dados", error);
  }
};