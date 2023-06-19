import { provide } from "inversify-binding-decorators";
import { UserRepository } from "@repositories/user/user.repository";
import { IGetUserResponseDTO } from "./getuser-user.dto";
import { Report, StatusCode } from "@expressots/core";

@provide(GetUserUseCase)
class GetUserUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(req): Promise<IGetUserResponseDTO | null> {
    const { id } = req;
    const user = await this.userRepository.find(id);

    if (!user) {
      Report.Error(
        "User not found",
        StatusCode.NotFound,
        "create-user-usecase",
      );
    }

    return user;
  }
}

export { GetUserUseCase };
