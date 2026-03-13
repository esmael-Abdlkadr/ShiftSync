import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSkillDto } from './dto/create-skill.dto';

@Injectable()
export class SkillsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.skill.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const skill = await this.prisma.skill.findUnique({
      where: { id },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!skill) {
      throw new NotFoundException(`Skill with ID ${id} not found`);
    }

    return skill;
  }

  async create(dto: CreateSkillDto) {
    const existing = await this.prisma.skill.findFirst({
      where: { name: { equals: dto.name, mode: 'insensitive' } },
    });

    if (existing) {
      throw new ConflictException(`Skill "${dto.name}" already exists`);
    }

    return this.prisma.skill.create({
      data: { name: dto.name },
    });
  }

  async remove(id: string) {
    const skill = await this.prisma.skill.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });

    if (!skill) {
      throw new NotFoundException(`Skill with ID ${id} not found`);
    }

    if (skill._count.users > 0) {
      throw new ConflictException(
        `Cannot delete skill "${skill.name}" because ${skill._count.users} user(s) have this skill assigned`
      );
    }

    await this.prisma.skill.delete({ where: { id } });

    return { message: `Skill "${skill.name}" deleted successfully` };
  }
}
