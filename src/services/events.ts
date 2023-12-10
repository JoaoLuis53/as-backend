import { PrismaClient, Prisma } from "@prisma/client";
import * as people from './people';
import * as groups from './groups';
import { encryptMatch } from "../utils/match";

const prisma = new PrismaClient();

export const getAll = async () => {
    try {
        return await prisma.event.findMany();
    } catch (err) { return false }
}

export const getOne = async (id: number) => {
    try {
        return await prisma.event.findFirst({ where: { id } });
    } catch (err) { return false }
}

type EventsCreateData = Prisma.Args<typeof prisma.event, 'create'>['data'];
export const add = async (data: EventsCreateData) => {
    try {
        return await prisma.event.create({ data })
    } catch (err) { return false }
}

type EventsUpdateData = Prisma.Args<typeof prisma.event, 'update'>['data'];
export const update = async (id: number, data: EventsUpdateData) => {
    try {
        return await prisma.event.update({ where: { id }, data });
    } catch (err) { return false }
}


export const remove = async (id: number) => {
    try {
        return await prisma.event.delete({ where: { id } });
    } catch (err) { return false }
}

export const doMatches = async (id: number): Promise<boolean> => {
    const eventItem = await prisma.event.findFirst({ where: { id }, select: { grouped: true } });

    if (eventItem) {
        const peopleList = await people.getAll({ id_event: id });
        if (peopleList) {
            let sortedList: { id: number, match: number }[] = [];
            let sortable: number[] = [];

            let attempts = 0;
            let maxAttemps = peopleList.length;
            let keepTrying = true;
            while (keepTrying && attempts < maxAttemps) {
                keepTrying = false;
                attempts++;
                sortedList = [];
                sortable = peopleList.map(item => item.id);

                for (let i in peopleList) {
                    let sortableFiltrered: number[] = sortable;
                    if (eventItem.grouped) {
                        sortableFiltrered = sortable.filter(sortableItem => {
                            let sortablePerson = peopleList.find(item => item.id === sortableItem);
                            return peopleList[i].id_group !== sortablePerson?.id_group;
                        });
                    }

                    if (sortableFiltrered.length === 0 || (sortableFiltrered.length === 1 && peopleList[i].id === sortableFiltrered[0])) {
                        keepTrying = true;
                    } else {
                        let sortedIndex = Math.floor(Math.random() * sortableFiltrered.length);
                        while (sortableFiltrered[sortedIndex] === peopleList[i].id) {
                            sortedIndex = Math.floor(Math.random() * sortableFiltrered.length);
                        }

                        sortedList.push({
                            id: peopleList[i].id,
                            match: sortableFiltrered[sortedIndex]
                        });
                        sortable = sortable.filter(item => item !== sortableFiltrered[sortedIndex]);
                    }
                }
            }

            if (attempts < maxAttemps) {
                for (let i in sortedList) {
                    await people.update({
                        id: sortedList[i].id,
                        id_event: id
                    }, { matched: encryptMatch(sortedList[i].match) });
                }
                return true;
            }

        }
    }

    return false;
}